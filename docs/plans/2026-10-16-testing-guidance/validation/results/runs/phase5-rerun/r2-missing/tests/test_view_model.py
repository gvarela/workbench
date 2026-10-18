from rides.view_model import format_distance


def test_formats_with_one_decimal():
    assert format_distance(12.34) == "12.3 km"


def test_rounds_to_the_nearest_tenth():
    assert format_distance(12.25) == "12.3 km"


def test_rounds_a_halfway_tenth_up_when_binary_float_sits_below_it():
    assert format_distance(1.15) == "1.2 km"


def test_keeps_the_decimal_on_a_whole_number_of_tenths_at_ten():
    assert format_distance(10.0) == "10.0 km"


def test_keeps_a_whole_number_whole():
    assert format_distance(5) == "5 km"
