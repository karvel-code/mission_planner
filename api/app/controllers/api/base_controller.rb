module Api
  # Shared behaviour for the JSON API. Every error response has the shape
  # { errors: [{ field, message }] }: 422 for invalid input, 404 for a missing record.
  class BaseController < ApplicationController
    # Request bodies are read from the top level, e.g. { name:, planet_ids: [] }.
    wrap_parameters false

    rescue_from ActiveRecord::RecordNotFound do |error|
      render_errors([ { field: nil, message: "#{error.model.underscore.humanize} not found" } ], status: :not_found)
    end

    private

    def render_errors(errors, status: :unprocessable_content)
      render json: { errors: errors }, status: status
    end

    def model_errors(record)
      record.errors.map { |error| { field: error.attribute.to_s, message: error.full_message } }
    end

    def planet_ids_by_name = Planet.pluck(:name, :id).to_h
  end
end
