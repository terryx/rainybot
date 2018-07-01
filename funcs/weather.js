const {from, bindNodeCallback, of} = require('rxjs')
const {mergeMap, map, filter, bufferCount, toArray, reduce, skip} = require('rxjs/operators')
const Telegram = require('telegraf/telegram')
const request = require('request-promise')
const {parseString} = require('xml2js')
const weather = require('../data/weather')

const constructor = (apikey, token) => {
  const bot = new Telegram(token)
  const api = {}

  api.showArea = (message, send = true) => {
    return from(weather.area).pipe(
      map(res => ({text: res, callback_data: res.toLowerCase()})),
      bufferCount(1),
      toArray(),
      mergeMap(res => {
        const text = 'Please select an area'
        const opts = {
          reply_markup: {
            inline_keyboard: res,
            one_time_keyboard: true
          }
        }

        if (send) {
          return from(bot.sendMessage(message.chat.id, text, opts))
        }

        return of(res)
      })
    )
  }

  api.shortForecast = (message, send = true) => {
    const dataset = '2hr_nowcast'
    const url = `http://api.nea.gov.sg/api/WebAPI?dataset=${dataset}&keyref=${apikey}`
    const source = from(request(url))
    const name = message.data || message.text

    return source.pipe(
      mergeMap(res => bindNodeCallback(parseString)(res)),
      map(res => res.channel.item[0]),
      map(res => ({
        weatherForecast: res.weatherForecast[0].area,
        validTime: res.validTime
      })),
      mergeMap(res => from(res.weatherForecast).pipe(
        map(data => data['$']),
        filter(data => data.name.toLowerCase() === name),
        map(data => `${weather.abbreviation[data.forecast]} in ${data.name} between ${res.validTime}`)
      )),
      mergeMap(text => {
        const bot = new Telegram(token)

        if (send) {
          return from(bot.sendMessage(message.from.id, text))
        }

        return of(text)
      })
    )
  }

  api.longForecast = (message, send = true) => {
    const dataset = '24hrs_forecast'
    const url = `http://api.nea.gov.sg/api/WebAPI?dataset=${dataset}&keyref=${apikey}`
    const source = from(request(url))

    return source.pipe(
      mergeMap(res => bindNodeCallback(parseString)(res)),
      map(res => res.channel),
      mergeMap(res => from(Object.keys(res)).pipe(
        skip(2),
        reduce((acc, cur) => {
          if (res[cur][0].forecast) {
            acc.push(`<b>${res[cur][0].forecast[0]}</b>`)
          }

          if (res[cur][0].timePeriod) {
            const key = res[cur][0]
            const time = cur.replace(/\b\w/g, a => a.toUpperCase())
            acc.push(`<b>${time} ${key.timePeriod[0]}</b>`)
            acc.push(`Northern - ${weather.abbreviation[key.wxnorth[0]]}`)
            acc.push(`Western - ${weather.abbreviation[key.wxwest[0]]}`)
            acc.push(`Southern - ${weather.abbreviation[key.wxsouth[0]]}`)
            acc.push(`Eastern - ${weather.abbreviation[key.wxeast[0]]}`)
            acc.push(`Central - ${weather.abbreviation[key.wxcentral[0]]}`)
          }

          acc.push(`\n`)

          return acc
        }, [])
      )),
      mergeMap(text => {
        const bot = new Telegram(token)

        if (send) {
          return from(bot.sendMessage(message.chat.id, text.join('\n'), {parse_mode: 'HTML'}))
        }

        return of(text)
      })
    )
  }

  return api
}

module.exports = constructor