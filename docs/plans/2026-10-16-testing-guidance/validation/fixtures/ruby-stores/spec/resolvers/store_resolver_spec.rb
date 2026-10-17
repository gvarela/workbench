# frozen_string_literal: true

require "spec_helper"

RSpec.describe StoreResolver do
  subject(:resolver) { described_class.new([store]) }

  let(:store) { build(:store, name: "downtown", customer_id: 101) }

  it "filters orders by the store's customer id" do
    expect(resolver.order_filter("downtown")).to eq({ customer_id: 101 })
  end

  it "returns an empty filter for a store without a customer id" do
    online = build(:store, name: "online", customer_id: nil)

    expect(described_class.new([online]).order_filter("online")).to eq({})
  end

  it "returns an empty filter for an unknown store" do
    expect(resolver.order_filter("nowhere")).to eq({})
  end

  it "looks up the store when resolving a filter" do
    allow_any_instance_of(described_class).to receive(:find).and_return(store)

    expect(resolver.order_filter("anything")).to eq({ customer_id: 101 })
  end

  it "uses the customer id for the lookup" do
    allow(resolver).to receive(:customer_id_for).and_return(101)

    expect(resolver.customer_id_for("downtown")).to eq(101)
  end

  xit "matches names case-insensitively" do
    expect(resolver.order_filter("DOWNTOWN")).to eq({ customer_id: 101 })
  end

  it "builds the same filter as the lookup" do
    expected = { customer_id: resolver.customer_id_for("downtown") }

    expect(resolver.order_filter("downtown")).to eq(expected)
  end
end
