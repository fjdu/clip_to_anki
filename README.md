Available at [Chrome Store](https://chrome.google.com/webstore/detail/clip-to-anki/fgokpeebjjlplghkjahdcidpfnpcemmd?utm_source=chrome-ntp-icon).

Automatically extract information from supported websites to create an Anki card (note), and add to the Anki database.  All the fields can be manually edited before importing to Anki.

By default the card will be imported to an Anki deck named "Papers", and will have a type name "Paper".

The Fields included in the card are:
- Front (default to the title of a paper in the case of arxiv)
- Back (default to the abstract in the case of arxiv)
- Year
- Author
- Title
- URL
- Journal
- Tags (default to the paper category in the case of arxiv)

A running anki-connect (see https://foosoft.net/projects/anki-connect/index.html) listening to 127.0.0.1:8765 is required for this to work.

Currently supported sites:
- arxiv
