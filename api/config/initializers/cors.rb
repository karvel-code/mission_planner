# Be sure to restart your server when you modify this file.

# Allow the web frontend (a separate origin) to call the API.
# CORS_ORIGINS is a comma-separated list; it defaults to the Vite dev server.

# Read more: https://github.com/cyu/rack-cors

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*ENV.fetch("CORS_ORIGINS", "http://localhost:5173").split(",").map(&:strip))

    resource "/api/*",
      headers: :any,
      methods: [ :get, :post, :put, :patch, :delete, :options, :head ]
  end
end
