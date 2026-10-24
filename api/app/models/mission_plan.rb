# A saved mission: who it's for, the spacecraft, the passengers, and the route.
# Save through MissionPlans::Save, which also caches the calculated totals.
#
# Only a malformed route blocks saving. Capacity, range, time, temperature,
# and star stops are violations shown on the plan, so infeasible plans can be
# kept as drafts (docs/ASSUMPTIONS.md #10).
class MissionPlan < ApplicationRecord
  belongs_to :spacecraft
  has_many :mission_stops, -> { order(:position) }, dependent: :destroy, autosave: true, inverse_of: :mission_plan

  validates :name, presence: true
  validates :passenger_count, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validate :route_is_well_formed

  # The planets in visiting order, including stops not yet saved.
  def route
    mission_stops.reject(&:marked_for_destruction?).sort_by(&:position).map(&:planet)
  end

  # Replaces the route. Old stops are deleted when the plan is saved.
  def route=(planets)
    mission_stops.to_a.each do |stop|
      stop.new_record? ? mission_stops.delete(stop) : stop.mark_for_destruction
    end
    planets.each_with_index { |planet, position| mission_stops.build(planet:, position:) }
  end

  private

  def route_is_well_formed
    planets = route

    errors.add(:route, "must start at Earth") unless planets.first&.name == MissionCalculator::EARTH
    errors.add(:route, "needs at least one destination after Earth") if planets.size < 2
    planets.each_cons(2).with_index(1) do |(previous, planet), position|
      errors.add(:route, "visits #{planet.name} twice in a row (stop #{position})") if planet == previous
    end
  end
end
