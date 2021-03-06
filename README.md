# Instagram Widget

With the Instagram Widget you can customise your homescreen to show your profile status, your favourite pictures or the growth of a profile. You will find a few [examples](#examples) below.

## Installation
To get this widget to work copy the contents of [Instagram Widget.js](Instagram%20Widget.js), create a new widget in Scriptable and paste the copied code. Then add a Scriptable widget to your home screen (all sizes are supported, check the [examples](#examples) to find which size suits your needs).

<img src="img/instructions.jpg" width="300">

After adding the widget to your homescreen you will have to set the script and the widget parameter. The script has to be the one you caopied all the code into and the parameter needs to be a valid instagram username.

**Additional notes**

* You will need to run the script inside Scriptable first
* You will need to login to instagram when running the script the first time (this is [https://instagram.com/](https://instagram.com/))
* The widget parameter can be any username, but only a private user if you follow then with the account you're logging in with
* Have fun :)

## Settings
To edit the settings, run the script inside the app. You can now choose whether you want to edit your preferences, update the script, or preview a widget. When you are finished editing the settings, make sure to save them by tapping the save button (top right corner). If the window is closed without saving, the settings are not updated.

## Examples
### Small Widget
```
parameter = username
```

<img src="img/small.PNG" width="600">

The small widget is for viewing current followers and media count.

### Medium Widget
```
parameter = username
```

<img src="img/medium.PNG" width="600">

The medium widget shows random recent pictures.

### Large Widget
```
parameter = username
```

<img src="img/large.PNG" width="300">

As the widgets are updated, the fetched profile data is logged into files (iCloud/Scriptable/IGWidget/Logs). This widget shows the growth/change of your/the users follower count over time (last 24h).

## For anyone who wants to know
### Caching

The Instagram Widget is caching your instagram session id cookie, to fetch the profile data. Also any time the data is fetched, it is cached (this is per profile). For example, if you create a small widget with username xy and a medium widget with username yz, there will be one cache file per user. The cache files are updated every hour, to not send too many queries to instagram (if this happens, instagram will temp-block your user).

### Logging

Every time the user data is renewed, three main data points are logged (this also happens per user):

* follower count
* following count
* media count

The data is logged for use in the large widget.
