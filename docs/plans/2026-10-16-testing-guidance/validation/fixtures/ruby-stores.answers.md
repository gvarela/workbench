# ruby-stores: answer key for the planted smells

This file is the answer key for `ruby-stores/spec/resolvers/store_resolver_spec.rb`. It lives beside the fixture, never inside it, and is never copied into a scratch run. Line numbers refer to the spec file as shipped (after the comment markers were removed).

## Planted smells (the auditor should flag these)

| Line | Example description | Smell | Expected cop |
| ------ | --------------------- | ------- | -------------- |
| 25 | "looks up the store when resolving a filter" | `allow_any_instance_of` stubs the class under test | `RSpec/AnyInstance` |
| 31 | "uses the customer id for the lookup" | `allow(resolver)` stubs the subject itself | `RSpec/SubjectStub` |
| 36 | "matches names case-insensitively" | `xit` without a reason; hides a failing example | `RSpec/PendingWithoutReason` |
| 41 | "builds the same filter as the lookup" | Mirrored oracle: the expected value is computed by `resolver.customer_id_for`, the production code under test | none (rubric only) |

## Sound controls (the auditor must not flag these)

| Line | Example description |
| ------ | --------------------- |
| 10 | "filters orders by the store's customer id" |
| 14 | "returns an empty filter for a store without a customer id" |
| 20 | "returns an empty filter for an unknown store" |
