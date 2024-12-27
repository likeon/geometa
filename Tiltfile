load('ext://uibutton', 'cmd_button', 'text_input')

k8s_yaml('.ci/libsql.yaml')
k8s_resource('libsql-server', port_forwards=8080)

k8s_yaml('.ci/postgres.yaml')
k8s_resource('postgres-server', port_forwards=5432)

local_resource(
    'vite',
    serve_cmd='npm run dev',
    resource_deps=['libsql-server'],
    links=['http://localhost:5173/'],
)
