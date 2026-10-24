require "rails_helper"

RSpec.describe MissionStop do
  let(:plan) { create(:mission_plan) }

  it "allows each position only once per plan" do
    duplicate = described_class.new(mission_plan: plan, planet: plan.route.first, position: 0)

    expect { duplicate.save!(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
  end

  it "allows the same position in different plans" do
    expect(create(:mission_plan).mission_stops.first.position).to eq(plan.mission_stops.first.position)
  end

  it "requires a whole, non-negative position" do
    expect(described_class.new(mission_plan: plan, planet: plan.route.first, position: -1)).to be_invalid
  end

  it "does not let a planet on a saved route be deleted" do
    expect { plan.route.last.destroy }.to raise_error(ActiveRecord::InvalidForeignKey)
  end
end
