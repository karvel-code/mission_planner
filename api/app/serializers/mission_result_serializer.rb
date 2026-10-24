# JSON for a MissionResult: totals, legs with path segments for drawing, and
# the violations and advisories. Bodies are given as planet ids, looked up by
# name in `planet_ids_by_name` (names are unique in the catalog).
#
# Coordinates are km in the orbital plane, with the Sun at (0, 0). Angles are
# radians counter-clockwise from +x; an arc's `sweep` is signed the same way.
module MissionResultSerializer
  module_function

  def call(result, spacecraft:, planet_ids_by_name:)
    {
      feasible: result.feasible?,
      spacecraft_id: spacecraft.id,
      passenger_count: result.passengers,
      totals: {
        distance_km: result.total_length_km,
        range_used_km: result.total_range_used,
        range_available_km: spacecraft.range_km,
        duration_hours: result.total_duration_h
      },
      legs: result.legs.map { |leg| leg(leg, planet_ids_by_name) },
      violations: result.violations.map { |issue| issue(issue) },
      advisories: result.advisories.map { |issue| issue(issue) }
    }
  end

  def leg(leg, planet_ids_by_name)
    trajectory = leg.trajectory

    {
      from_planet_id: planet_ids_by_name.fetch(leg.from.name),
      to_planet_id: planet_ids_by_name.fetch(leg.to.name),
      distance_km: leg.length_km,
      range_used_km: leg.range_used,
      duration_hours: leg.duration_h,
      departure_wrap_km: trajectory.departure_wrap,
      bypassed_planet_ids: leg.bypassed.map { |body| planet_ids_by_name.fetch(body.name) },
      arrival: point(trajectory.arrival),
      segments: trajectory.segments.map { |segment| segment(segment) }
    }
  end

  def segment(segment)
    case segment
    when Trajectory::Line
      { type: "line", from: point(segment.from), to: point(segment.to), length_km: segment.length }
    when Trajectory::Arc
      {
        type: "arc", centre: point(segment.circle.centre), radius_km: segment.circle.radius,
        from: point(segment.from), to: point(segment.to),
        start_angle: segment.circle.angle_of(segment.from), sweep: segment.sweep, length_km: segment.length
      }
    end
  end

  def issue(issue) = { code: issue.code.to_s, message: issue.message, details: issue.details }

  def point(point) = { x: point.x, y: point.y }
end
