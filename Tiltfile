postgres_port = os.environ['TILT_PORT_POSTGRES']
api_port = os.environ['TILT_PORT_API']
frontend_port = os.environ['TILT_PORT_FRONTEND']

k8s_yaml('.tilt/k8s/postgres.yaml')

k8s_resource(
    'postgres-server',
    port_forwards='{}:5432'.format(postgres_port),
)

local_resource(
    'frontend',
    serve_dir='./apps/frontend',
    serve_cmd='PORT={} npm run dev'.format(frontend_port),
    serve_env={
        'API_URL': 'http://localhost:{}'.format(api_port),
        'DATABASE_URL': 'postgres://postgres:postgres@localhost:{}/geometa'.format(postgres_port),
    },
    resource_deps=['postgres-server', 'api'],
    links=['http://localhost:{}/'.format(frontend_port)],
)

local_resource(
    'api',
    serve_dir='./apps/api',
    serve_cmd='bun run dev',
    serve_env={
        'SERVER_PORT': api_port,
        'DATABASE_URL': 'postgres://postgres:postgres@localhost:{}/geometa'.format(postgres_port),
    },
    resource_deps=['postgres-server'],
    links=['http://localhost:{}/api/docs'.format(api_port)],
)
