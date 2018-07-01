const {of, throwError} = require('rxjs')
const {mergeMap, tap, map} = require('rxjs/operators')
const WeatherFunc = require('./weather')
const weatherData = require('../data/weather')

const incoming = (event, context, callback) => {
  if (!event.body) {
    return callback(null, {
      statusCode: 200,
      body: ''
    })
  }

  const body = JSON.parse(event.body)

  const source = of(body)
    .pipe(
      tap(body => console.log(JSON.stringify(body, null, 2))),
      mergeMap(body => {
        const answers = weatherData.area.map(a => a.toLowerCase())
        const weatherFunc = WeatherFunc(process.env.APIKEY, process.env.TOKEN)

        if (body.message) {
          const {text} = body.message
          if (text === '/start') {
            return weatherFunc.showArea(body.message)
          }

          if (text === '/tomorrow') {
            return weatherFunc.longForecast(body.message)
          }
        }

        if (body.callback_query) {
          const data = body.callback_query.data.toLowerCase()
          if (answers.includes(data)) {
            return weatherFunc.shortForecast(body.callback_query)
          }
        }

        return throwError(new Error('no such command'))
      }),
      map(res => res.text)
    )

  return source.subscribe(
    () => console.info('OK'),
    error => {
      console.error(error.message)
      callback(null, {statusCode: 200})
    },
    () => callback(null, {statusCode: 200})
  )
}

module.exports = {incoming}
