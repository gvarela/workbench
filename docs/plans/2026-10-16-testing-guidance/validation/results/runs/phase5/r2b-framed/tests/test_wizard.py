from playwright.sync_api import expect


def test_wizard_opens_on_sleep_with_later_questions_hidden(page, wizard_url):
    page.goto(wizard_url)
    expect(page.locator('[data-question="sleep"]')).to_be_visible()
    expect(page.locator('[data-question="soreness"]')).to_be_hidden()


def answer(page, question, value):
    page.locator(f'[data-question="{question}"] button[data-value="{value}"]').click()


def test_answering_sleep_shows_soreness_and_focuses_its_first_answer(page, wizard_url):
    page.goto(wizard_url)
    answer(page, "sleep", "good")
    expect(page.locator('[data-question="soreness"]')).to_be_visible()
    expect(page.locator('[data-question="soreness"] button[data-value="none"]')).to_be_focused()


def test_answering_soreness_shows_mood_and_focuses_its_first_answer(page, wizard_url):
    page.goto(wizard_url)
    answer(page, "sleep", "good")
    answer(page, "soreness", "some")
    expect(page.locator('[data-question="mood"]')).to_be_visible()
    expect(page.locator('[data-question="mood"] button[data-value="up"]')).to_be_focused()
