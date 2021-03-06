// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: camera-retro;
const DEBUG = false

const lerp = (x, y, a) => x * (1 - a) + y * a;
const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
const invlerp = (x, y, a) => clamp((a - x) / (y - x));
const range = (x1, y1, x2, y2, a) => lerp(x2, y2, invlerp(x1, y1, a));

function formatText(text, font) {
	text.textColor = new Color('#ffffff')
	text.centerAlignText()
	text.font = font
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

async function showAlert(title, message, options) {
	let alert = new Alert()
	alert.title = title
	alert.message = message
	options.forEach(option => {
		alert.addAction(option)
	})
	return await alert.presentAlert()
}

const igWidget = {
	
	initialize(iCloudInUse = true) {
		this.version = 'v1.0.0' // Don't change this
		this.username = args.widgetParameter || 'unsplash'
		this.fm = iCloudInUse ? FileManager.iCloud() : FileManager.local()
		this.root = this.fm.documentsDirectory() + '/IGWidget'
		this.cachePath = this.root + '/cache.json'
		this.settingsPath = this.root + '/settings.json'
		this.profileCachePath = this.root + `/Profiles/${this.username}.cache`
		this.imageCachePath = this.root + `/Profiles/${this.username}_img.cache`
		this.logPath = this.root + `/Logs/${this.username}.log`
		this.images = undefined
		this.user = undefined
		this.settings = undefined
		this.sessionid = undefined
	},

	async authorize() {
		let url = 'https://instagram.com/'
		let req = new Request(url)
		await req.load()
		let result = {}
		req.response.cookies.forEach(cookie => {
			if (cookie.name == 'sessionid') {result.sessionid = cookie.value; result.expiresDate = cookie.expiresDate}
		})
		if (! result.sessionid) {
			if (config.runsInWidget) {throw 'You have to run this script inside the app first'}
			await showAlert('Instagram login', 'You will have to login to instagram', ['Continue'])
			let webview = new WebView()
			await webview.loadURL(url)
			await webview.present(false)
			return await this.authorize()
		} else {
			await this.writeJSONTo(result, this.cachePath)
			this.sessionid = result.sessionid
			return result
		}
	},

	async logout() {
		let req = new Request('https://www.instagram.com/accounts/logout')
		await req.load()
		if (this.fm.fileExists(this.cachePath)) {await this.fm.remove(this.cachePath)}
	},

	async fetchData() {
		const profileURL = `https://www.instagram.com/${this.username}/?__a=1`
		let req = new Request(profileURL)
		let headers = {
			'Cookie': `sessionid=${this.sessionid}`
		}
		req.headers = headers
		try {
			var response = await req.loadJSON()
		} catch (Error) {
			throw "Something went wrong. Try deleting the cache."
		}
		response.graphql.user.last_updated = Date.now()
		this.user = response.graphql.user
		await this.writeJSONTo(this.user, this.profileCachePath)
		await this.logData()
		
		const imageURL = `https://instagram.com/graphql/query/?query_id=17888483320059182&variables=%7B%22id%22:%22${this.user.id}%22,%22first%22:50,%22after%22:null%7D`
		req = new Request(imageURL)
		req.headers = headers
		try {
			var response = await req.loadJSON()
		} catch (Error) {
			throw "Something went wrong. Try deleting the cache."
		}
		this.images = response.data.user.edge_owner_to_timeline_media
		await this.writeJSONTo(this.images, this.imageCachePath)
		return this.user
	},
	
	async preview(size) {
		if (!size) {size = 'small'}
		let w
		switch (size) {
			case 'small':
			case 'general':
				w = await this.createSmallWidget()
				await w.presentSmall()
				break
			case 'medium':
				w = await this.createMediumWidget()
				await w.presentMedium()
				break
			case 'large':
				w = await this.createLargeWidget()
				await w.presentLarge()
				break
		}
	},
	
	async fetchDefaultSettings() {
		const url = 'https://raw.githubusercontent.com/wiebecommajonas/instagram-widget/master/default-settings.json'
		let req = new Request(url)
		let json = await req.loadJSON()
		this.settings = json
		await this.writeJSONTo(json, this.settingsPath)
		return json
	},
	
	async fetchSettingsOptions() {
		const url = 'https://raw.githubusercontent.com/wiebecommajonas/instagram-widget/master/settings-options.json'
		let req = new Request(url)
		let json = await req.loadJSON()
		return json
	},

	async editSettingCategory(table, category) {
		var settingsOptions = await this.fetchSettingsOptions()
		table.removeAllRows()
		let header = new UITableRow()
		let backButton = header.addButton('< Back')
		backButton.widthWeight = 30
		backButton.dismissOnTap = false
		backButton.onTap = async () => {
			await this.editSettings(table)
		}
		let heading = header.addText(category)
		heading.widthWeight = 40
		heading.titleFont = Font.headline()
		heading.centerAligned()
		let saveButton = header.addButton('Save')
		saveButton.widthWeight = 15
		saveButton.rightAligned()
		saveButton.dismissOnTap = true
		saveButton.onTap = async () => {
			await this.writeJSONTo(this.settings, this.settingsPath)
		}
		let previewButton = header.addButton('Preview')
		previewButton.widthWeight = 15
		previewButton.rightAligned()
		previewButton.dismissOnTap = false
		previewButton.onTap = async () => {
			await this.preview(category.toLowerCase())
		}
		table.addRow(header)
		for (let setting in this.settings[category]) {
			let row = new UITableRow()
			row.addText(setting, this.settings[category][setting])
			row.dismissOnSelect = false
			row.onSelect = async () => {
				await this.updateSetting(category, setting, settingsOptions[category][setting])
				await this.editSettingCategory(table, category)
			}
			table.addRow(row)
		}
		table.reload()
	},

	async editSettings(tableArg) {
		if (!tableArg) {
			var table = new UITable()
			table.showSeparators = true
		} else {
			var table = tableArg
			table.removeAllRows()
		}
		let header = new UITableRow()
		let spacer = header.addText('')
		spacer.widthWeight = 0.3
		let heading = header.addText('Settings')
		heading.widthWeight = 0.4
		heading.titleFont = Font.headline()
		heading.centerAligned()
		let saveButton = header.addButton('Save')
		saveButton.widthWeight = 0.3
		saveButton.rightAligned()
		saveButton.dismissOnTap = true
		saveButton.onTap = async () => {
			await this.writeJSONTo(this.settings, this.settingsPath)
		}
		table.addRow(header)
		for (let category in this.settings) {
			let row = new UITableRow()
			row.addText(category)
			row.dismissOnSelect = false
			row.onSelect = async () => {
				await this.editSettingCategory(table, category)
			}
			table.addRow(row)
		}
		if (!tableArg) await table.present()
		else table.reload()
	},
	
	async updateSetting(category, setting, options) {
		let result = options[await showAlert('setting', 'Choose a value for this setting.', options)]
		this.settings[category][setting] = result
	},

	getProfileInfo() {
		let result = {
			fbid: this.user.fbid,
			id: this.user.id,
			name: this.user.full_name,
			username: this.user.username,
			media_count: this.user.edge_owner_to_timeline_media.count,
			followers: this.user.edge_followed_by.count,
			following: this.user.edge_follow.count,
			profile_pic_url: this.user.profile_pic_url_hd || this.user.profile_pic_url
		}
		return result
	},

	getMediaData() {
		let result = {
			imageData: this.user.edge_owner_to_timeline_media.edges
		}
		return result
	},
	
	getGraphPadding() {
		return {
			1: 20,
			2: 20,
			3: 25,
			4: 30,
			5: 35,
			6: 40,
			7: 47,
			8: 53,
			9: 57,
			10: 65
		}
	},
	
	formatNumber(number) {
		return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, this.settings.General['Thousands Separator']);
	},

	async getJSONFrom(path) {
		if (this.fm.fileExists(path)) {
			if (! this.fm.isFileDownloaded(path)) {await this.fm.downloadFileFromiCloud(path)}
			let result = await this.fm.read(path)
			if (! result || ! result.toRawString()) return undefined
			else return JSON.parse(result.toRawString())
		}
		return undefined
	},

	async writeJSONTo(json, path) {
		let filename = this.fm.fileName(path, true)
		let s = path.split('/')
		s.pop()
		let dir = s.join('/')
		if (! this.fm.isDirectory(dir)) {
			this.fm.createDirectory(dir, true)
		}
		await this.fm.writeString(path, JSON.stringify(json))
	},

	async logData() {
		let data = this.getProfileInfo()
		let logTime = String(Date.now())
		let log = await this.getJSONFrom(this.logPath)
		log = (log == undefined) ? {} : log
		log[logTime] = {
			followers: data.followers,
			following: data.following,
			media_count: data.media_count
		}
		let s = this.logPath.split('/')
		s.pop()
		let dir = s.join('/')
		if (!this.fm.isDirectory(dir)) {await this.fm.createDirectory(dir, true)}
		await this.fm.writeString(this.logPath, JSON.stringify(log))
	},

	async showJSON() { // for debugging purposes 
		let table = new UITable()
		for (let key in this.user) {
			let row = new UITableRow()
			let valueText = row.addText(String(this.user[key]), String(key))
			table.addRow(row)
		}
		table.showSeparators = true
		await table.present(false)
	},

	async createDebugWidget() {
		let user = this.getProfileInfo()
		let widget = new ListWidget()
		var stack = widget.addStack()
		var text = widget.addText(JSON.stringify(user))
		text.font = Font.regularRoundedSystemFont(5)
		return widget
	},

	async createSmallWidget() {
		let user = this.getProfileInfo()
		let widget = new ListWidget()
		if (this.settings.Small['Open Instagram on Tap'] == 'true') widget.url = `https://www.instagram.com/${this.username}`
		widget.setPadding(13, 0, 13, 0) // top, leading, bottom, trailing
		var widgetRows = widget.addStack()
		widgetRows.layoutVertically()
		
		// gackground gradient
		var gradient = new LinearGradient()
		gradient.colors = [new Color('#8134AF'), new Color('#DD2A7B'), new Color('#FEDA77')]
		gradient.locations = [0.0,0.5,1.0]
		gradient.startPoint = new Point(1,0)
		gradient.endPoint
		widget.backgroundGradient = gradient
		
		// username
		var usernameRow = widgetRows.addStack()
		usernameRow.url = `https://www.instagram.com/${this.username}`
		usernameRow.layoutHorizontally()
		usernameRow.addSpacer()
		if (user.profile_pic_url) {
			var req = new Request(user.profile_pic_url)
			var img = await req.loadImage()
			var image = usernameRow.addImage(img)
			image.imageSize = new Size(24, 24)
			image.cornerRadius = 12
			usernameRow.addSpacer(3)
		}
		var usernameText = usernameRow.addText(`${this.username}`)
		formatText(usernameText, Font.semiboldRoundedSystemFont(12))
		usernameRow.addSpacer()
		usernameRow.setPadding(0, 0, 15, 0)
		usernameRow.centerAlignContent()
		
		// followers
		var followerCountRow = widgetRows.addStack()
		followerCountRow.layoutHorizontally()
		followerCountRow.addSpacer()
		var followerCount = followerCountRow.addText(`${this.formatNumber(user.followers)}`)
		formatText(followerCount, Font.heavyRoundedSystemFont(20))
		followerCountRow.addSpacer()
		followerCountRow.setPadding(0, 0, -3, 0)
		var followerTextRow = widgetRows.addStack()
		followerTextRow.layoutHorizontally()
		followerTextRow.addSpacer()
		var followerText = followerTextRow.addText('Followers')
		formatText(followerText, Font.regularRoundedSystemFont(8))
		followerTextRow.addSpacer()
		followerTextRow.setPadding(0, 0, 15, 0)
		
		// media count
		var mediaCountRow = widgetRows.addStack()
		mediaCountRow.layoutHorizontally()
		mediaCountRow.addSpacer()
		var mediaCount = mediaCountRow.addText(`${this.formatNumber(user.media_count)}`)
		formatText(mediaCount, Font.heavyRoundedSystemFont(20))
		mediaCountRow.addSpacer()
		mediaCountRow.setPadding(0, 0, -3, 0)
		var mediaTextRow = widgetRows.addStack()
		mediaTextRow.layoutHorizontally()
		mediaTextRow.addSpacer()
		var mediaText = mediaTextRow.addText('Pictures')
		formatText(mediaText, Font.regularRoundedSystemFont(8))
		mediaTextRow.addSpacer()
		
		widget.addSpacer() // push everything up 
		return widget
	},

	async createMediumWidget() {
		this.images = await this.getJSONFrom(this.imageCachePath)
		if (!this.images) await this.fetchData()
		let widget = new ListWidget()
		var data = this.images.edges
		var imageCount = data.length
		var randomImages = []
		var usedIndices = []
		for (i=0; i < 3; i++) {
			do {
				var randomIndex = Math.floor(Math.random() * imageCount)
			} while (usedIndices.includes(randomIndex) && imageCount > 0)
			var datum = data[randomIndex].node
			var url = (datum.__typename == "GraphVideo") ? datum.thumbnail_src : datum.display_url
			var req = new Request(url)
			req.headers = {
				'Cookie': `sessionid=${this.session}`
			}
			var image = await req.loadImage()
			imageCount--
			usedIndices.push(randomIndex)
			let obj = {
				'image': image,
				'url': `https://www.instagram.com/p/${datum.shortcode}`
			}
			randomImages.push(obj)
		}
		
		widget.addSpacer()
		var imagesRow = widget.addStack()
		imagesRow.layoutHorizontally()
		imagesRow.addSpacer()
		let square = (Device.screenSize().height < Device.screenSize().width) ? Device.screenSize().height : Device.screenSize().width
		square = square/4.3
		for (i=0; i < randomImages.length; i++) {
			var rect = imagesRow.addStack()
			if (this.settings.Medium['Open Instagram on Tap'] == 'true') rect.url = randomImages[i].url
			if (this.settings.Medium['Picture Geometry'] == 'square') rect.size = new Size (square,square)
			var wImage = rect.addImage(randomImages[i].image)
			wImage.applyFillingContentMode()
			let spaceSetting = this.settings.Medium['Picture Spacing']
			let space
			switch (spaceSetting) {
				case "auto":
					space = null
					break
				case "none":
					space = 0
					break
				case "narrow":
					space = 4
					break
				case "medium":
					space = 8
					break
				case "wide":
					space = 15
					break
			}
			if (i != randomImages.length - 1) {imagesRow.addSpacer(space)}
		}
		imagesRow.addSpacer()
		widget.addSpacer()
		return widget
	},

	async createLargeWidget() {
		let user = this.getProfileInfo()
		var widget = new ListWidget()
		if (this.settings.Large['Open Instagram on Tap'] == 'true') widget.url = `https://www.instagram.com/${this.username}`
		widget.setPadding(13, 0, 13, 0) // top, leading, bottom, trailing
		var widgetRows = widget.addStack()
		widgetRows.layoutVertically()
		
		// username
		var usernameRow = widgetRows.addStack()
		usernameRow.layoutHorizontally()
		usernameRow.addSpacer()
		if (user.profile_pic_url) {
			var req = new Request(user.profile_pic_url)
			var img = await req.loadImage()
			var image = usernameRow.addImage(img)
			image.imageSize = new Size(24, 24)
			image.cornerRadius = 12
			usernameRow.addSpacer(3)
		}
		let dataPoint = this.settings.Large['Display Data']
		let label = (dataPoint == 'media_count') ? 'Media count' : dataPoint.replace(/^\w/, (c) => c.toUpperCase())
		var usernameText = usernameRow.addText(`${user.username} | ${label}`)
		usernameText.font = Font.boldRoundedSystemFont(12)
		usernameRow.addSpacer()
		usernameRow.setPadding(0, 0, 15, 0)
		usernameRow.centerAlignContent()
		
		var log = await this.getJSONFrom(this.logPath)
		var xsRaw = []
		var ysRaw = []
		let timeRange
		switch (this.settings.Large['Time Range']) {
			case 'last 24h':
				timeRange = 24
				break
			case 'last week':
				timeRange = 24*7
				break
			case 'all time':
			default:
				timeRange = -1
				break
		}
		
		for (let entry in log) {
			if (timeRange && (entry >= Date.now() - timeRange*60*60*1000)) {
				xsRaw.push(parseInt(entry))
				ysRaw.push(log[entry][dataPoint])
			} else if (timeRange === -1) {
				xsRaw.push(parseInt(entry))
				ysRaw.push(log[entry][dataPoint])
			}
		}
		var maxX = Math.max(...xsRaw)
		var minX = Math.min(...xsRaw)
		var maxY = Math.max(...ysRaw)
		var minY = Math.min(...ysRaw)
		
		const showLabels = this.settings.Large['Show Labels'] == 'true'
		const FONT_SIZE = 8
		const axisMax = 300
		const topPadding = 0
		const bottomPadding = (showLabels) ? 25 : 0
		const rightPadding = (showLabels) ? 20 : 0
		const leftPadding = (showLabels) ? this.getGraphPadding()[`${maxY}`.length] : 0
		
		var xs = [...xsRaw]
		var ys = [...ysRaw]
		
		let noChanges = ys.filter(onlyUnique).length == 1
		
		for (i=0; i < xs.length; i++) { // xs & ys are same length
			xs[i] = range(minX, maxX, leftPadding, axisMax-rightPadding, xsRaw[i])
			ys[i] = (noChanges) ? (axisMax-bottomPadding)/2 : range(minY, maxY, axisMax-bottomPadding, topPadding, ysRaw[i])
		}
		var points = []
		for (i=0; i < xs.length ; i++) { // xs & ys still same length
			let p = new Point(xs[i],ys[i])
			points.push(p)
		}
		
		var graphRow = widget.addStack()
		graphRow.layoutHorizontally()
		graphRow.addSpacer()
		var drawing = new DrawContext()
		drawing.opaque = false
		drawing.respectScreenScale = true
		drawing.size = new Size(300,300)
		var graph = new Path()
		graph.addLines(points)
		drawing.addPath(graph)
		let graphColor = Color.dynamic(new Color('#0000ff'), new Color('#ff0000'))
		drawing.setStrokeColor(graphColor)
		drawing.setLineWidth(0.5)
		drawing.strokePath()
		var path = new Path()
		path.addLines([new Point(leftPadding,topPadding), new Point(leftPadding,axisMax-bottomPadding), new Point(axisMax-rightPadding,axisMax-bottomPadding)])
		drawing.addPath(path)
		var axisColor = Color.dynamic(new Color('#000000'), new Color('#ffffff'))
		drawing.setLineWidth(1)
		drawing.setStrokeColor(axisColor)
		drawing.strokePath()
		
		if (this.settings.Large['Show Labels'] == 'true') {
			drawing.setFont(Font.regularRoundedSystemFont(FONT_SIZE))
			drawing.setTextColor(axisColor)
			drawing.setTextAlignedRight()
			if (noChanges) {
				drawing.drawTextInRect(`${this.formatNumber(maxY)}`, new Rect(0,(axisMax-bottomPadding)/2 - FONT_SIZE/2,leftPadding-5,FONT_SIZE))
			} else {
				drawing.drawTextInRect(`${this.formatNumber(maxY)}`, new Rect(0,0,leftPadding-5,FONT_SIZE))
				drawing.drawTextInRect(`${this.formatNumber(minY)}`, new Rect(0,axisMax-bottomPadding-FONT_SIZE,leftPadding-5,FONT_SIZE))
			}
			drawing.setTextAlignedCenter()
			let dateTimeMin = new Date(minX).toLocaleString(Device.locale().replace('_','-')).split(', ')
			let dateTimeMax = new Date(maxX).toLocaleString(Device.locale().replace('_','-')).split(', ')
			drawing.drawTextInRect(`${dateTimeMin[0]}`, new Rect(leftPadding-19,axisMax-bottomPadding+FONT_SIZE,42,FONT_SIZE))
			drawing.drawTextInRect(`${dateTimeMin[1]}`, new Rect(leftPadding-19,axisMax-bottomPadding+FONT_SIZE*2,42,FONT_SIZE))
			drawing.drawTextInRect(`${dateTimeMax[0]}`, new Rect(axisMax-rightPadding-21,axisMax-bottomPadding+FONT_SIZE,42,FONT_SIZE))
			drawing.drawTextInRect(`${dateTimeMax[1]}`, new Rect(axisMax-rightPadding-21,axisMax-bottomPadding+FONT_SIZE*2,42,FONT_SIZE))
		}
		
		var graph = graphRow.addImage(drawing.getImage())
		graphRow.addSpacer()
			
		widget.addSpacer()
		
		return widget
	}
}

igWidget.initialize(true)

var sessionCache = await igWidget.getJSONFrom(igWidget.cachePath)
if (! sessionCache || new Date() >= new Date(sessionCache.expiresDate)) { console.log('Refreshing session cache'); sessionCache = await igWidget.authorize() }
igWidget.sessionid = sessionCache.sessionid

var userCache = await igWidget.getJSONFrom(igWidget.profileCachePath)
if (!userCache || new Date() >= new Date(userCache.last_updated + 60*60*1000)) { console.log('Refreshing user cache'); userCache = await igWidget.fetchData() }
igWidget.user = userCache

igWidget.settings = await igWidget.getJSONFrom(igWidget.settingsPath)
if (!igWidget.settings) {
	await igWidget.fetchDefaultSettings()
}

if (config.runsInApp) {
	
	let menu = await showAlert('Menu', 'What do you want to do?', ['Edit Preferences','Preview Widget', 'Update', 'Exit'])
	
	if (menu == 0) { // Preferences
		await igWidget.editSettings()
	} else if (menu == 1) { // Preview Widget
		let widgetSizes = ['Small', 'Medium', 'Large']
		let a = await showAlert('Show Widget', 'Which widget do you want to show?', widgetSizes)
		await igWidget.preview(widgetSizes[a].toLowerCase())
	} else if (menu == 2) { // Update
		let currentPath = module.filename
		let url = 'https://api.github.com/repos/wiebecommajonas/instagram-widget/tags'
		let req = new Request(url)
		let response = await req.loadJSON()
		if (response[0].name == igWidget.version) {
			await showAlert('Update', 'Your Script is up to date.', ['Ok'])
		} else {
			await showAlert('Update', `Updating script to ${response[0].name}. The current script will be backed up.`, ['Continue'])
			let backupFilename = igWidget.fm.fileName(module.filename, false) + ' Backup.js'
			let backupFilepath = igWidget.fm.documentsDirectory() + '/' + backupFilename
			if (igWidget.fm.fileExists(backupFilepath)) {
				await igWidget.fm.remove(backupFilepath)
			}
			await igWidget.fm.copy(module.filename, backupFilepath)
			let url = `https://raw.githubusercontent.com/wiebecommajonas/instagram-widget/${response[0].name}/Instagram%20Widget.js`
			let req = new Request(url)
			let javascript = await req.loadString()
			await igWidget.fm.writeString(module.filename, javascript)
			let settingsBackupPath = igWidget.root + '/' + igWidget.fm.fileName(igWidget.settingsPath, false) + '-backup.json'
			if (igWidget.fm.fileExists(settingsBackupPath)) {
				await igWidget.fm.remove(settingsBackupPath)
			}
			await igWidget.fm.copy(igWidget.settingsPath, settingsBackupPath)
			url = `https://raw.githubusercontent.com/wiebecommajonas/instagram-widget/${response[0].name}/default-settings.json`
			req = new Request(url)
			let newDefaultSettings = await req.loadJSON()
			let newSettings = {...newDefaultSettings, ...igWidget.settings}
			await igWidget.fm.writeString(igWidget.settingsPath, JSON.stringify(newSettings))
			url = `https://github.com/wiebecommajonas/instagram-widget/blob/${response[0].name}/CHANGELOG.md`
			let webview = new WebView()
			await webview.loadURL(url)
			await webview.present(false)
			await showAlert('Update', 'The update is finished.', ['Ok'])
		}
	} else if (menu == 3) { // Exit: do nothing
		// doing nothing
	}
}

if (config.runsInWidget) {
	let w
	switch (config.widgetFamily) {
		case 'small':
			w = await igWidget.createSmallWidget()
			break
		case 'medium':
			w = await igWidget.createMediumWidget()
			break
		case 'large':
			w = await igWidget.createLargeWidget()
			break
	}
	Script.setWidget(w)
}