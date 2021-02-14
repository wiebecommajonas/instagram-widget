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

function pad(num) {
	return num.toString().padStart(2,'0')
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

async function createDebugWidget(string) {
	let widget = new ListWidget()
	var stack = widget.addStack()
	var text = widget.addText(string)
	text.font = Font.regularRoundedSystemFont(5)
	return widget
}

async function createSmallWidget() {
	let widget = new ListWidget()
	widget.setPadding(13, 0, 13, 0) // top, leading, bottom, trailing
	var widgetRows = widget.addStack()
	widgetRows.layoutVertically()
	widgetRows.url = `https://www.instagram.com/${DATA.username}`
	
	// gackground gradient
	var gradient = new LinearGradient()
	gradient.colors = [new Color('#8134AF'), new Color('#DD2A7B'), new Color('#FEDA77')]
	gradient.locations = [0.0,0.5,1.0]
	gradient.startPoint = new Point(1,0)
	gradient.endPoint
	widget.backgroundGradient = gradient
	
	// username
	var usernameRow = widgetRows.addStack()
	usernameRow.url = `https://www.instagram.com/${DATA.username}`
	usernameRow.layoutHorizontally()
	usernameRow.addSpacer()
	if (DATA.profile_pic_url) {
		var req = new Request(DATA.profile_pic_url)
		var img = await req.loadImage()
		var image = usernameRow.addImage(img)
		image.imageSize = new Size(24, 24)
		image.cornerRadius = 12
		usernameRow.addSpacer(3)
	}
	var usernameText = usernameRow.addText(`${DATA.username}`)
	formatText(usernameText, Font.semiboldRoundedSystemFont(12))
	usernameRow.addSpacer()
	usernameRow.setPadding(0, 0, 15, 0)
	usernameRow.centerAlignContent()
	
	// followers
	var followerCountRow = widgetRows.addStack()
	followerCountRow.layoutHorizontally()
	followerCountRow.addSpacer()
	var followerCount = followerCountRow.addText(`${DATA.followers}`)
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
	var mediaCount = mediaCountRow.addText(`${DATA.media_count}`)
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
}

async function createMediumWidget() {
	let widget = new ListWidget()

	var data = await fetchMediaData(INPUT)
	
	var imageCount = data.imageData.length
	console.log(imageCount)
	var randomImages = []
	var usedIndices = []
	for (i=0; i < 3; i++) {
		do {
			var randomIndex = Math.floor(Math.random() * data.imageData.length)
		} while (usedIndices.includes(randomIndex) && imageCount > 0)
		var datum = data.imageData[randomIndex].node
		var url = (datum.__typename == "GraphVideo") ? datum.thumbnail_src : datum.display_url
		console.log(url)
		var req = new Request(url)
		req.headers = {
			'Cookie': `sessionid=${SESSION_ID}`
		}
		var image = await req.loadImage()
		imageCount--
		usedIndices.push(randomIndex)
		randomImages.push(image)
	}
	
	widget.addSpacer()
	var imagesRow = widget.addStack()
	imagesRow.layoutHorizontally()
	imagesRow.addSpacer()
	for (i=0; i < randomImages.length; i++) {
		var rect = imagesRow.addStack()
		rect.size = new Size (100,100)
		var wImage = rect.addImage(randomImages[i])
		wImage.applyFillingContentMode()
		if (i != randomImages.length - 1) {imagesRow.addSpacer(7)}
		//wImage.imageSize = new Size(100,100)
	}
	imagesRow.addSpacer()
	widget.addSpacer()
	return widget
}

async function createLargeWidget() {
	var widget = new ListWidget()
	widget.setPadding(13, 0, 13, 0) // top, leading, bottom, trailing
	var widgetRows = widget.addStack()
	widgetRows.layoutVertically()
	
	// username
	var usernameRow = widgetRows.addStack()
	usernameRow.layoutHorizontally()
	usernameRow.addSpacer()
	if (DATA.profile_pic_url) {
		var req = new Request(DATA.profile_pic_url)
		var img = await req.loadImage()
		var image = usernameRow.addImage(img)
		image.imageSize = new Size(24, 24)
		image.cornerRadius = 12
		usernameRow.addSpacer(3)
	}
	var usernameText = usernameRow.addText(`${DATA.username}`)
	formatText(usernameText, Font.boldRoundedSystemFont(12))
	usernameRow.addSpacer()
	usernameRow.setPadding(0, 0, 15, 0)
	usernameRow.centerAlignContent()
	
	var log = await getLog(INPUT)
	var xs = []
	var ys = []
	for (let entry in log) {
		xs.push(parseInt(entry))
		ys.push(log[entry].followers)
	}
	var maxX = Math.max(...xs)
	var minX = Math.min(...xs)
	var maxY = Math.max(...ys)
	var minY = Math.min(...ys)
	
	for (i=0; i < xs.length; i++) { // xs & ys are same length
		xs[i] = range(minX, maxX, 0, 200, xs[i])
		ys[i] = range(minY, maxY, 200, 0, ys[i])
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
	var graph = new Path()
	graph.addLines(points)
	drawing.addPath(graph)
	drawing.setStrokeColor(new Color('#0000ff'))
	drawing.setLineWidth(2)
	drawing.strokePath()
	var path = new Path()
	path.addLines([new Point(0,0), new Point(0,200), new Point(200,200)])
	drawing.addPath(path)
	drawing.setStrokeColor(Color.dynamic(new Color('#ffffff'), new Color('#000000')))
	drawing.strokePath()
	var img = drawing.getImage()
	var graph = graphRow.addImage(img)
	graphRow.addSpacer()
		
	widget.addSpacer()
	
	return widget
}

async function authorize() {
	var url = 'https://instagram.com/'
	var req = new Request(url)
	await req.load()
	let result = {}
	req.response.cookies.forEach(cookie => {
		if (cookie.name == 'sessionid') {result.sessionid = cookie.value; result.expiresDate = cookie.expiresDate}
	})
	if (! result.sessionid) {
		if (config.runsInWidget) {throw 'You have to run this script inside the app first'}
		await showAlert('Instagram login', 'You will have to login to instagram', ['Continue'])
		var webview = new WebView()
		await webview.loadURL(url)
		await webview.present(false)
		return await authorize()
	} else {
		await writeJSONTo(result, 'cache.json')
		return result
	}
}

async function logout() {
	var url = 'https://www.instagram.com/accounts/logout'
	var req = new Request(url)
	await req.load()
	
	var fm = FileManager.iCloud()
	var path = fm.documentsDirectory() + '/IGWidget/cache.json'
	if (fm.fileExists(path)) {await fm.remove(path)}
}

async function fetchProfileData(username) {
	const url = `https://www.instagram.com/${username}/?__a=1`
	var req = new Request(url)
	req.headers = {
		'Cookie': `sessionid=${SESSION_ID}`
	}
	try {
		var response = await req.loadJSON()
	} catch (Error) {
		throw "This is killing me"
	}
	let result = {
		fbid: response.graphql.user.fbid,
		id: response.graphql.user.id,
		name: response.graphql.user.full_name,
		username: response.graphql.user.username,
		media_count: response.graphql.user.edge_owner_to_timeline_media.count,
		followers: response.graphql.user.edge_followed_by.count,
		following: response.graphql.user.edge_follow.count,
		profile_pic_url: response.graphql.user.profile_pic_url_hd || response.graphql.user.profile_pic_url
	}
	await writeToLog(result)
	return result
}

async function fetchMediaData(username) {
	const url = `https://www.instagram.com/${username}/?__a=1`
	var req = new Request(url)
	req.headers = {
		'Cookie': `sessionid=${SESSION_ID}`
	}
	try {
		var response = await req.loadJSON()
	} catch (Error) {
		throw "Invalid session, try deleting the cache and running the script again"
	}
	let result = {
		imageData: response.graphql.user.edge_owner_to_timeline_media.edges
	}
	return result
}

async function getJSONFrom(filename) {
	var fm = FileManager.iCloud()
	var path = fm.documentsDirectory() + `/IGWidget/${filename}`
	if (fm.fileExists(path)) {
		if (! fm.isFileDownloaded(path)) {await fm.downloadFileFromiCloud(path)}
		let result = await fm.read(path)
		if (! result || ! result.toRawString()) return undefined
		else return JSON.parse(result.toRawString())
	}
	return undefined
}

async function writeJSONTo(json, filename) {
	var fm = FileManager.iCloud()
	var path = fm.documentsDirectory() + `/IGWidget/${filename}`
	var data = Data.fromString(JSON.stringify(json))
	if (! fm.isDirectory(fm.documentsDirectory() + '/IGWidget')) {
		fm.createDirectory(fm.documentsDirectory() + '/IGWidget', true)
	}
	await fm.write(path, data)
}

async function writeToLog(json) {
	var fm = FileManager.iCloud()
	if (! fm.isDirectory(fm.documentsDirectory() + '/IGWidget/Logs')) {
		fm.createDirectory(fm.documentsDirectory() + '/IGWidget/Logs', true)
	}
	var path = fm.documentsDirectory() + `/IGWidget/Logs/${json.username}.log`
	let log = {}
	if (fm.fileExists(path)) {
		if (! fm.isFileDownloaded(path)) {await fm.downloadFileFromiCloud(path)}
		log = JSON.parse(await fm.readString(path))
	}
	var logDate = new Date()
	var logCT = String(Date.now())
	var logTime = pad(logDate.getDate()) + '.' + pad(logDate.getMonth() + 1) + '.' + logDate.getFullYear() + ' ' + pad(logDate.getHours()) + ':' + pad(logDate.getMinutes()) + ':' + pad(logDate.getSeconds())
	log[logCT] = {
		time: logTime,
		followers: json.followers,
		following: json.following,
		media_count: json.media_count
	}
	let data = Data.fromString(JSON.stringify(log))
	await fm.write(path, data)
}

async function getLog(username) {
	var fm = FileManager.iCloud()
	var path = fm.documentsDirectory() + `/IGWidget/Logs/${username}.log`
	if (fm.fileExists(path)) {
		if (! fm.isFileDownloaded(path)) {await fm.downloadFileFromiCloud(path)}
		return JSON.parse(await fm.readString(path))
	} else {
		return undefined
	}
}

async function showJSON(data) {
	var table = new UITable()
	for (let key in data) {
		console.log(`${key}: ${data[key]}`)
		var row = new UITableRow()
		var valueText = row.addText(String(data[key]), String(key))
		table.addRow(row)
	}
	table.showSeparators = true
	await table.present(false)
}

var cache = await getJSONFrom('cache.json')
if (! cache || new Date() >= new Date(cache.expiresDate)) { cache = await authorize() }

const SESSION_ID = cache.sessionid

let INPUT = args.widgetParameter || 'unsplash'
var DATA = await fetchProfileData(INPUT)

if (!DATA) {throw "Please enter a valid username"}
if (DEBUG && config.runsInApp) {
	console.log(DATA)
	await showJSON(DATA)
}

if (config.runsInApp) {
	var w = await createMediumWidget()
	await w.presentMedium()
} else if (config.runsInWidget) {
	switch (config.widgetFamily) {
		case 'small':
			var w = await createSmallWidget()
			break
		case 'medium':
			var w = await createMediumWidget()
			break
		case 'large':
			var w = await createLargeWidget()
			break
	}
	Script.setWidget(w)
}
