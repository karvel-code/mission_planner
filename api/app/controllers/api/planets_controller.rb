module Api
  class PlanetsController < BaseController
    # GET /api/planets: every body, the Sun included, outwards from the Sun.
    def index
      render json: Planet.order(:distance_from_sun_km).map { |planet| PlanetSerializer.call(planet) }
    end
  end
end
