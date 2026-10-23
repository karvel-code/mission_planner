module Geometry
  module Tangents
    module_function

    # Points where the two tangent lines from `point` touch `circle`, as
    # [counter-clockwise, clockwise] around the circle's centre. Returns [] when
    # the point is inside the circle or on its surface (within EPSILON × radius).
    #
    # With d = |point - centre|, the radius to a tangent point is perpendicular
    # to the tangent line, so the angle at the centre between the point and a
    # tangent point is acos(r / d).
    def from_point(point, circle)
      d = circle.centre.distance_to(point)
      return [] if d <= circle.radius * (1 + EPSILON)

      direction = circle.angle_of(point)
      spread = Math.acos(circle.radius / d)

      [ circle.point_at(direction + spread), circle.point_at(direction - spread) ]
    end

    # Lines touching both circles, as [point_on_a, point_on_b] pairs: the two
    # outer tangents first (both centres on the same side), then the two inner
    # tangents (the line passes between the circles).
    #
    # Inner tangents are omitted when the circles touch or overlap; [] is
    # returned when one circle is inside the other. Gaps within EPSILON × the
    # larger radius count as touching.
    #
    # A tangent line with unit normal n lies at distance ra from A's centre and
    # rb from B's. Writing d for the distance between centres and φ for the angle
    # between n and the A→B axis, cos φ = (rb - ra) / d for outer tangents and
    # -(ra + rb) / d for inner ones. The tangent points are the feet of the
    # perpendiculars from each centre: A - ra·n, and B - rb·n (outer) or
    # B + rb·n (inner).
    def common(circle_a, circle_b)
      offset = circle_b.centre - circle_a.centre
      d = offset.length
      ra = circle_a.radius
      rb = circle_b.radius
      tolerance = EPSILON * [ ra, rb ].max
      return [] if d <= (ra - rb).abs + tolerance

      axis = Math.atan2(offset.y, offset.x)
      pairs = common_pairs(circle_a, circle_b, axis, (rb - ra) / d, inner: false)
      pairs += common_pairs(circle_a, circle_b, axis, -(ra + rb) / d, inner: true) if d > ra + rb + tolerance
      pairs
    end

    def common_pairs(circle_a, circle_b, axis, cos_phi, inner:)
      phi = Math.acos(cos_phi.clamp(-1.0, 1.0))

      [ axis + phi, axis - phi ].map do |normal|
        on_a = circle_a.point_at(normal + Math::PI)
        on_b = inner ? circle_b.point_at(normal) : circle_b.point_at(normal + Math::PI)
        [ on_a, on_b ]
      end
    end
    private_class_method :common_pairs
  end
end
