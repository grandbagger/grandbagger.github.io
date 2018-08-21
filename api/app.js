var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var fs = require('fs')
var csv = require('csvtojson')

const supportedDivisions = [
  'LIMITED',
  'PRODUCTION',
  'OPEN',
  'CARRY OPTICS',
  'PCC',
  'SINGLE STACK',
  'LIMITED 10',
  'REVOLVER',
]

const divisionAliasMap = {
  LTD: 'LIMITED',
  PROD: 'PRODUCTION',
  CO: 'CARRY OPTICS',
  SS: 'SINGLE STACK',
  LTDTEN: 'LIMITED 10',
  REV: 'REVOLVER',
}

const data = fs.readFileSync('./data.csv', {encoding:'utf8', flag:'r'});
const rows = data.split('\n')
const meta = rows.shift().split(',')

const parsed = rows.map((row, rowId) => {
  const rowObj = {}
  const fields = row.split(',')
  meta.forEach((fieldName, fieldIndex) => {
    rowObj[fieldName] = fields[fieldIndex]
	})

  // convert hf to number & skip zeros
  rowObj.hit_factor = Number(rowObj.hit_factor)
  if (!rowObj.hit_factor) {
    return false
	}

  // fix known invalid division names
  const division = rowObj.division
  rowObj.division = divisionAliasMap[division] || division

  // skip invalid divisions
  if (!supportedDivisions.includes(division)) {
    return false
	}

  // skip no USPSA number
  if (!rowObj.member_number) {
    return false
	}

  // fix classifier code
  let code = rowObj.stage_classifiercode
    .toUpperCase()
		.replace(".", '')
		.replace("'", '')
		.replace('"', '')
		.replace(atob('Ig=='), '')
		.replace(atob('MDktMDggQ1JBQ0tFUkpBQ0s='), '09-08')
		.replace(atob('MTMtMDUgVElDSy1UT0NL'), '13-05')
		.replace('0309', '03-09')
		.replace('9964', '99-64')
		.replace('9910', '99-10')
		.replace(' ', '')
		.replace('CM', '')
    .replace('--', '-')
    .replace('_', '-')
    .replace('O6', '06')
    .trim()
  if (code.match(/\d\d\d\d/g)) {
    code = code.substr(0,2) + '-' + code.substr(2,2)
	}
  if (code.startsWith('-')) {
    code = code.substr(1, code.length - 1)
	}
  const match = code.match(/\d\d-\d\d/g)
  if (match) {
    code = match[0]
	}
  if (!code?.match(/^\d\d-\d\d$/g)) {
    return false
	}
	rowObj.stage_classifiercode = code
	return rowObj
}).filter(Boolean)

console.log(JSON.stringify(parsed[256]))
console.log(parsed.length-rows.length)
console.log(parsed.length)

const hitFactorSort = ({ hit_factor: a}, { hit_factor: b }) => {
	if (b > a) {
		return 1
	} else if (b < a) {
		return -1
	}
	return 0
}



const dedupeKey = e => e.member_number + ';' + e.stage_classifiercode + ';' + e.hit_factor + ';' + e.division
const dedupeDivision = division => {
  const keys = {}
  return division.filter(entry => {
    const key = dedupeKey(entry)
    if (keys[key]) {
      console.log('dupe detected for key ' + key)
      return false
    }

    keys[key] = true

    return key
  })
}

console.log('processing and de-duping')
let dupes = 0
let nondupes = 0
const dupeKeys = {}
const processed = parsed.reduce((acc, cur) => {
  const classifier = acc[cur.stage_classifiercode] || {}
  const division = classifier[cur.division] || []
  const dupeKey = dedupeKey(cur)
  if (dupeKeys[dupeKey]) {
    dupes++;
  } else {
    nondupes++
    division.push(cur)
    dupeKeys[dupeKey] = true
  }
  return {...acc, [cur.stage_classifiercode]: {...classifier, [cur.division]: division}}
}, {})
console.log(dupes + ' dupes removed')
console.log(nondupes + ' non-dupes remaining')

function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

console.log('splitting into multiple directories & files')
Object.keys(processed).forEach(stageKey => {
  const divisions = processed[stageKey]
  Object.keys(divisions).forEach(divisionKey => {
    const division = divisions[divisionKey]
    division.sort(hitFactorSort)
    const dir = './sorted/' + stageKey + '/' + divisionKey.replace(' ', '')
    const all = dir + '/all.json'
    const top100 = dir + '/top100.json'
    console.log(stageKey + ' - ' + divisionKey + ': ' + dir)
    ensureDirectoryExistence(all)
    ensureDirectoryExistence(top100)
    fs.writeFileSync(all, JSON.stringify(division))
    division.splice(100, division.length - 100)
    fs.writeFileSync(top100, JSON.stringify(division))
  })
})
console.log('sorting done')

var app = express();

app.get("/api", async (req, res) => {
	  res.json(processed['99-11'].LIMITED.sort(hitFactorSort)[0]);
});
app.get("/api/all", async (req, res) => {
	  res.json(processed);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
