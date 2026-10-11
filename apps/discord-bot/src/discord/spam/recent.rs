//! Guild-scoped single-flight checks. No lock held across unrelated content.

use std::collections::{HashMap, HashSet};
use std::future::Future;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::sync::Mutex as AsyncMutex;

use super::Classified;
use super::grouped_report::ReportGroup;
use crate::config::RecentChecksConfig;

pub struct RecentChecks {
    settings: RecentChecksConfig,
    entries: Mutex<HashMap<[u8; 32], Entry>>,
}

struct Entry {
    case: Arc<Case>,
    touched: Instant,
}

pub struct Case {
    pub report: ReportGroup,
    pub banned_authors: AsyncMutex<HashSet<u64>>,
    checked: AsyncMutex<Option<Completed>>,
    failure_cooldown: Duration,
}

struct Completed {
    result: Classified,
    at: Instant,
    window_started: Instant,
}

impl RecentChecks {
    pub fn new(settings: RecentChecksConfig) -> Self {
        Self {
            settings,
            entries: Mutex::new(HashMap::new()),
        }
    }

    pub fn get(&self, key: [u8; 32], first_message: u64) -> Result<Arc<Case>, &'static str> {
        self.get_at(key, first_message, Instant::now())
    }

    fn get_at(
        &self,
        key: [u8; 32],
        first_message: u64,
        now: Instant,
    ) -> Result<Arc<Case>, &'static str> {
        let mut entries = self.entries.lock().expect("recent-check mutex poisoned");
        let ttl = Duration::from_secs(self.settings.ttl_seconds);
        // Never evict queued/running checks. Completed groups have fixed windows:
        // repeated spam cannot extend one report's in-memory history forever.
        entries.retain(|_, entry| {
            let Ok(checked) = entry.case.checked.try_lock() else {
                return true;
            };
            match checked.as_ref() {
                Some(completed) => now.saturating_duration_since(completed.window_started) < ttl,
                None => {
                    now.saturating_duration_since(entry.touched) < ttl
                        || Arc::strong_count(&entry.case) > 1
                }
            }
        });
        if let Some(entry) = entries.get(&key) {
            return Ok(entry.case.clone());
        }
        if entries.len() >= self.settings.max_entries {
            return Err("recent-check registry full; fail open");
        }
        let case = Arc::new(Case {
            report: ReportGroup::new(first_message),
            banned_authors: AsyncMutex::new(HashSet::new()),
            checked: AsyncMutex::new(None),
            failure_cooldown: Duration::from_secs(self.settings.failure_cooldown_seconds),
        });
        entries.insert(
            key,
            Entry {
                case: case.clone(),
                touched: now,
            },
        );
        Ok(case)
    }
}

impl Case {
    pub async fn check<F, Fut>(&self, classify: F) -> Classified
    where
        F: FnOnce() -> Fut,
        Fut: Future<Output = Classified>,
    {
        // Cancellation/panic drops guard; next waiter can become leader.
        let mut completed = self.checked.lock().await;
        if let Some(completed) = completed.as_ref()
            && (completed.result.diagnostics.failures.is_empty()
                || completed.at.elapsed() < self.failure_cooldown)
        {
            return completed.result.clone();
        }
        let result = classify().await;
        let now = Instant::now();
        let window_started = completed
            .as_ref()
            .map(|old| old.window_started)
            .unwrap_or(now);
        *completed = Some(Completed {
            result: result.clone(),
            at: now,
            window_started,
        });
        result
    }
}

#[cfg(test)]
mod tests {
    use super::super::{ClassifierDiagnostics, Verdict};
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    fn result(verdict: Verdict) -> Classified {
        Classified {
            verdict,
            diagnostics: ClassifierDiagnostics::default(),
        }
    }

    #[tokio::test]
    async fn concurrent_and_completed_duplicates_share_one_check() {
        let cache = RecentChecks::new(RecentChecksConfig::default());
        let case = cache.get([1; 32], 100).unwrap();
        let calls = AtomicUsize::new(0);
        let checks = (0..20).map(|_| {
            case.check(|| async {
                calls.fetch_add(1, Ordering::SeqCst);
                tokio::task::yield_now().await;
                result(Verdict::Spam)
            })
        });
        for checked in futures_util::future::join_all(checks).await {
            assert_eq!(checked.verdict, Verdict::Spam);
        }
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        assert!(Arc::ptr_eq(&case, &cache.get([1; 32], 200).unwrap()));
    }

    #[tokio::test]
    async fn cancelled_leader_releases_case_for_waiter() {
        let cache = RecentChecks::new(RecentChecksConfig::default());
        let case = cache.get([1; 32], 100).unwrap();
        let leader_case = case.clone();
        let (started, ready) = tokio::sync::oneshot::channel();
        let leader = tokio::spawn(async move {
            leader_case
                .check(|| async {
                    let _ = started.send(());
                    std::future::pending::<Classified>().await
                })
                .await;
        });
        ready.await.unwrap();
        leader.abort();
        let _ = leader.await;
        let checked = tokio::time::timeout(
            Duration::from_secs(1),
            case.check(|| async { result(Verdict::Accepted) }),
        )
        .await
        .unwrap();
        assert_eq!(checked.verdict, Verdict::Accepted);
    }

    #[tokio::test]
    async fn failures_cool_down_then_retry_but_disagreements_stay_cached() {
        let cache = RecentChecks::new(RecentChecksConfig::default());
        let case = cache.get([1; 32], 100).unwrap();
        let mut failure = result(Verdict::Indeterminate);
        failure
            .diagnostics
            .failures
            .push("provider failed".to_string());
        case.check(|| async { failure }).await;
        assert_eq!(
            case.check(|| async { panic!("must reuse cooldown") })
                .await
                .verdict,
            Verdict::Indeterminate
        );
        case.checked.lock().await.as_mut().unwrap().at = Instant::now() - Duration::from_secs(31);
        let mut disagreement = result(Verdict::Indeterminate);
        disagreement.diagnostics.disagreement = true;
        case.check(|| async { disagreement }).await;
        case.checked.lock().await.as_mut().unwrap().at = Instant::now() - Duration::from_secs(100);
        assert_eq!(
            case.check(|| async { panic!("must reuse disagreement") })
                .await
                .verdict,
            Verdict::Indeterminate
        );
    }

    #[tokio::test]
    async fn repeated_completed_copies_do_not_extend_retention_window() {
        let cache = RecentChecks::new(RecentChecksConfig {
            ttl_seconds: 10,
            ..Default::default()
        });
        let case = cache.get([1; 32], 100).unwrap();
        case.check(|| async { result(Verdict::Spam) }).await;
        let completed = case.checked.lock().await.as_ref().unwrap().window_started;
        let before = cache
            .get_at([1; 32], 200, completed + Duration::from_secs(9))
            .unwrap();
        assert!(Arc::ptr_eq(&case, &before));
        let after = cache
            .get_at([1; 32], 300, completed + Duration::from_secs(11))
            .unwrap();
        assert!(!Arc::ptr_eq(&case, &after));
    }

    #[test]
    fn queued_entries_are_not_evicted() {
        let cache = RecentChecks::new(RecentChecksConfig {
            max_entries: 1,
            ttl_seconds: 10,
            ..Default::default()
        });
        let now = Instant::now();
        let active = cache.get_at([1; 32], 100, now).unwrap();
        assert!(
            cache
                .get_at([2; 32], 200, now + Duration::from_secs(11))
                .is_err()
        );
        drop(active);
        assert!(
            cache
                .get_at([2; 32], 200, now + Duration::from_secs(12))
                .is_ok()
        );
    }
}
