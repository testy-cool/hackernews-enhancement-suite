Project Status
==============
This repository is a maintained fork of the original Hacker News Enhancement Suite by [testy.cool](https://testy.cool).
The codebase now targets Manifest V3 for Chromium-based browsers. Firefox support
is blocked until Mozilla enables service-worker powered MV3 extensions; follow the
instructions below to load the extension manually in Chrome, Edge, or other
Chromium browsers.


Hacker News Enhancement Suite
=============================

A Hacker News extension for Chrome and Chromium browsers which changes lots of
things.

Installation (Chrome / Edge)
----------------------------
1. Clone or download this repository.
2. Run `bash zip.sh` or simply keep the folder unpacked.
3. Visit `chrome://extensions`, enable *Developer mode*, click *Load unpacked*,
   and select the repository directory (or upload the generated zip to the
   Chrome Web Store if you maintain a listing).

Firefox Support
---------------
Manifest V3 service workers are still behind Mozilla’s compatibility roadmap, so
this fork is not yet installable from Firefox Add-ons. If you need MV2 support,
use the upstream archive or keep an eye on Mozilla’s MV3 rollout.

Features
--------
* Completely new style
* Easy access to all pages
* Enhanced comment threads
  * Collapsible comments
  * Inline commenting
  * Link to parent
  * Display all comments on paginated threads
  * Highlight the original poster
* Show and highlight new comments since you last viewed a thread
* Highlight links once clicked to more easily identify what you've recently visited
* Redirect back to the front page upon hitting an expired link
* Display how many times you've upvoted each user
* Graphs on polls
* Clickable links in self posts and on users profile pages
* New smooth and scalable up & down vote arrows
* Keyboard controls on index pages:
  * j - Next item
  * k - Previous item
  * o - Open story
  * l - Open story in a new tab
  * p - View comments
  * c - View comments in a new tab
  * b - Open both the comments and the story in new tabs
* Tag users

TODO
----
* Options page
* Put search in a better place + ajax auto-complete
* Do something with un-threaded comment lists (e.g. best comments)
* Make profiles prettier
* Allow user to highlight friends (ala RES)
* Show dead/grayed-out comments on mouse hover (or maybe a button)
* Test / make it work when user can see downvotes

Things I can't test
-------
I don't have enough karma to test down votes, creating polls, or topbar color

Compatability
-------
I do not test this extension with any other extensions active on Hacker News so I cannot guarantee that it will play nice. If you come across an apparent bug please make sure that any other extension are disabled or please mention which ones are enabled in the bug report.

Contributing
------------
See `AGENTS.md` for contributor guidelines, build commands, and testing advice tailored to this fork.

Privacy
-------
The full privacy policy is available at `docs/privacy-policy.md`. In short, all data stays on your device and exists only to power HNES features.

License
-------
MIT License, see LICENSE

Thanks
------
Wayne Larson for hckrnews.com and permission to use code from his extension which displays new comments.

@jarques for his HN+ extension (https://github.com/jarquesp/Hacker-News--) which was used as a starting point for this project.

Thanks to Samuel Stern (hatboysam) for the inline commenting.

Thanks to Vishnu Rajeevan (burntcookie90) for adding more keyboard shortcuts.

Thanks to Lewis Pollard (lewispollard) for highlighting a story once you've opened it and redirecting to the front page when you hit an expired link.

Thanks to Dean Harding (codeka) for replacing the up/down vote images with CSS buttons.

Thanks to Jiahua (jwang47) for his fork of Már Örlygsson's (maranomynet) linkify JQuery plugin.

Thanks for Dan Harper (danharper) and to Will Ridgers (wridgers) for some CSS fixes.

Thanks for Nuno Santos (nfvs) for styling the login page and other fixes.

Thanks to alanc10n for fixing issue 66

Thanks to sglantz for adding support for topcolor, issue 52

Thanks to ibejoeb for fixing the collapsible comments, improving comment performance, and many other improvements.

Thanks to SCdF for a bug fix.

Thanks to MaximeKjaer for adding the ability to tag users.

Thanks to c17r for a fix to the new comment highlighting.
