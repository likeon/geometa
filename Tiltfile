load('ext://uibutton', 'cmd_button', 'text_input')

k8s_yaml('.dev/postgres.yaml')
k8s_resource('postgres-server', port_forwards=5432)

local_resource(
    'frontend',
    serve_dir='./apps/frontend',
    serve_cmd='npm run dev',
    resource_deps=['postgres-server'],
    links=['http://localhost:5173/'],
)
local_resource(
    'api',
    serve_dir='./apps/api',
    serve_cmd='bun run dev',
    resource_deps=['postgres-server'],
    links=['http://localhost:3000/api/docs'],
)
