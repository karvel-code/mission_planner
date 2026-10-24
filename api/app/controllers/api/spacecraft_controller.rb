module Api
  class SpacecraftController < BaseController
    # GET /api/spacecraft: every spacecraft, with the planets it can land on.
    def index
      planets = Planet.all.to_a
      render json: Spacecraft.order(:id).map { |spacecraft| SpacecraftSerializer.call(spacecraft, planets) }
    end
  end
end
