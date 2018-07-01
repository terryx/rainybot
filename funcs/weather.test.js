const test = require('ava')
const Weather = require('./weather')
const { map } = require('rxjs/operators')
const config = require('../config.prd')()
const seeds = require('../tests/seeds')

test('show Area', t => {
  const weather = Weather(config.nea.apikey, config.telegram.token)

  return weather.showArea(seeds.message, false)
    .pipe(
      map(res => {
        t.log(res)
        t.pass()
      })
    )
})

test('2 hour forecast', t => {
  const weather = Weather(config.nea.apikey, config.telegram.token)

  return weather.shortForecast(seeds.callback_query, false)
    .pipe(
      map(res => {
        t.log(res)
        t.pass()
      })
    )
})

test('24 hour forecast', t => {
  const weather = Weather(config.nea.apikey, config.telegram.token)

  return weather.longForecast(seeds.message, false)
    .pipe(
      map(res => {
        t.log(res)
        t.pass()
      })
    )
})
