# 4chan XT is dead, Long live xtree

4chan XT is a script that adds various features to anonymous imageboards. It was originally developed for 4chan but has
no affiliation with it. 4chan *xtree* extends the original XT by adding option tree-style thread viewing.

4chan XT was originally forked from [4chan X](https://github.com/ccd0/4chan-x) for
[this PR](https://github.com/ccd0/4chan-x/pull/3341), It is a migration of 4chan X from coffeescript to
TypeScript/JavaScript. It is named XT both as a continuation of eXTended, and a T for TypeScript. This version, *xtree* is forked from [4chan xt](https://github.com/TuxedoTako/4chan-xt).

New features since the fork include:

- Tree style thread viewing

## Please note
**Uninstalling**: 4chan XT disables the native extension, so if you uninstall 4chan XT, you'll need to re-enable it.
To do this, click the `[Settings]` link in the top right corner, uncheck "`Disable the native extension`" in the panel
that appears, and click the "`Save Settings`" button. If you don't see a "`Save Settings`" button, it may be being
hidden by your ad blocker.

**Private browsing**: By default, 4chan XT remembers your last read post in a thread and which posts were made by you,
even if you are in private browsing / incognito mode. If you want to turn this off, uncheck the
`Remember Last Read Post` and `Remember Your Posts` options in the settings panel. You can clear all 4chan browsing
history saved by 4chan XT by resetting your settings. This fork also includes an option to export settings without
exporting your history.

Use of the "Link Title" feature to fetch titles of Youtube links is subject to Youtube's
[Terms of Service](https://www.youtube.com/t/terms) and [Privacy Policy](http://www.google.com/policies/privacy).
For more details on what information is sent to Youtube and other sites, and how to turn it off if you don't want the
feature, see upstream 4chan X's [privacy documentation](https://github.com/ccd0/4chan-x/wiki/Privacy).

## Install

To run an user script, you need an user script manager like Violentmonkey
\([Chrome](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag),
[Firefox](https://addons.mozilla.org/firefox/addon/violentmonkey/),
[Edge](https://microsoftedge.microsoft.com/addons/detail/eeagobfjdenkkddmbclomhiblgggliao)), or tampermonkey
\([Chrome](https://chrome.google.com/webstore/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo),
[Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/),
[Edge](https://microsoftedge.microsoft.com/addons/detail/iikmkjmpaadaobahmlepeloendndfphd),
[Safari](https://apps.apple.com/app/tampermonkey/id6738342400)).

This fork will be distributed through github releases.
There are known issues with updating user scripts through GitHub: [#34](https://github.com/TuxedoTako/4chan-xt/issues/34)
[violentmonkey#1673](https://github.com/violentmonkey/violentmonkey/issues/1673), but Greasy Fork doesn't allow the
minified version. Automatic updates are supported for the user script version, but not the Chrome extension.

## Build from source

The simplest build is as easy as `npm install` `npm run build`, but there are some options:

- `-min`: Minified output.
- `-platform=userscript`, `-platform=crx`: Only builds for one platform, and removes code related to only the other.
  Note that without this, the code is only build once without this optimization for both.
- `-no-format` Skips some formatting like switching the indent from the TypeScript output back from 4 to 2, and removing
  the decaffeinate suggestions comments. Might speed up the build, but the result is larger.
- `-test` Include tests in build.

## Troubleshooting
If you encounter a bug, that's a real shame.

### Other notes about this fork

<details>
<summary>Click to expand</summary>

- A lot of files have circular dependencies, but rollup can handle that
  - but for some scripts that add to the same object I had to merge them, like Posting/QR and site/SW.yotsuba.js
  - sometimes something might not be initialized before use, for example, `$.dict()` and `$.SECONDS`
    - I moved these to a new file called helpers.ts, which shouldn't have dependencies itself
- tsconfig.json has `"checkJs": true,`, and a lot of js files report type errors when opened because of unknown
  properties on objects and reassigning variables with different types. These errors don't block the bundle at this moment.
- the es 2020 target was chosen for optional chaining
- @violentmonkey/types was chosen over @types/greasemonkey because @types/greasemonkey only declares the GM object,
  and not GM\_ functions

</details>
</details>
