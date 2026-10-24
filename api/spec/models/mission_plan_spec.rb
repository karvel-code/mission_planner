require "rails_helper"

RSpec.describe MissionPlan do
  let(:earth) { create(:planet, :earth) }
  let(:mars) { create(:planet, name: "Mars") }
  let(:jupiter) { create(:planet, name: "Jupiter") }

  def plan_with(route, **attributes) = build(:mission_plan, route: route, **attributes)

  def route_errors(plan)
    plan.validate
    plan.errors[:route]
  end

  it "is valid with a name, a spacecraft, and a route from Earth to a destination" do
    expect(plan_with([ earth, mars ])).to be_valid
  end

  it "requires a name" do
    expect(plan_with([ earth, mars ], name: "")).to be_invalid
  end

  it "requires a spacecraft" do
    expect(plan_with([ earth, mars ], spacecraft: nil)).to be_invalid
  end

  it "requires a whole, non-negative passenger count" do
    expect(plan_with([ earth, mars ], passenger_count: -1)).to be_invalid
    expect(plan_with([ earth, mars ], passenger_count: 1.5)).to be_invalid
    expect(plan_with([ earth, mars ], passenger_count: 0)).to be_valid
  end

  describe "route" do
    it "must start at Earth" do
      expect(route_errors(plan_with([ mars, jupiter ]))).to include("must start at Earth")
    end

    it "needs at least one destination after Earth" do
      expect(route_errors(plan_with([ earth ]))).to include("needs at least one destination after Earth")
    end

    it "cannot visit the same planet twice in a row" do
      expect(route_errors(plan_with([ earth, mars, mars ]))).to include("visits Mars twice in a row (stop 2)")
    end

    it "may come back to a planet later" do
      expect(plan_with([ earth, mars, earth ])).to be_valid
    end

    it "may include stops that are only violations, such as a star" do
      expect(plan_with([ earth, create(:planet, :star, name: "Sun") ])).to be_valid
    end

    it "is saved as stops in order" do
      plan = plan_with([ earth, mars, jupiter ])
      plan.save!

      expect(plan.reload.route).to eq([ earth, mars, jupiter ])
      expect(plan.mission_stops.pluck(:position)).to eq([ 0, 1, 2 ])
    end

    it "replaces the stops of a saved plan" do
      plan = plan_with([ earth, mars, jupiter ])
      plan.save!

      plan.route = [ earth, jupiter ]
      plan.save!

      expect(plan.reload.route).to eq([ earth, jupiter ])
      expect(MissionStop.where(mission_plan: plan).count).to eq(2)
    end
  end

  it "deletes its stops when deleted" do
    plan = plan_with([ earth, mars ])
    plan.save!

    expect { plan.destroy }.to change(MissionStop, :count).by(-2)
  end
end
