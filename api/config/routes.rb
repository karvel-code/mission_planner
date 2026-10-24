Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api, defaults: { format: :json } do
    resources :planets, only: :index
    resources :spacecraft, only: :index
    resources :mission_calculations, only: :create
    resources :mission_plans, only: %i[index show create update destroy] do
      post :duplicate, on: :member
    end
  end
end
