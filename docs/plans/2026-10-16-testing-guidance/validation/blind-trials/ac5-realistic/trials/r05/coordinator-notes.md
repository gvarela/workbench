Check specifically:

- `list_rides` takes its cutoff from `WINDOW_DAYS`, and the ride on the cutoff day is listed
- `format_distance` rounds half up to one decimal (AC-2), and both pages call it
- the rides page total is built from the rides `list_rides` returns
- nothing changes how distance is stored (non-goal)

A minor test-style issue with passing tests is not a FAIL.
