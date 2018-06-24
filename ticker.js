const debug = require('util').debuglog('ticker')
const axios = require('axios')


class WorldCupThrottle {

  constructor(rate = 10) {
    this.schedule = {}
    this.rate = this.countdown = rate
  }

  inProgress() {
    const now = Date.now()
    return Object.values(this.schedule).findIndex(dt => now >= dt) !== -1
  }

  updateSchedule(matches) {
    matches
      .filter(match => match.status === 'future' || match.status === 'in progress')
      .forEach(match => this.schedule[match.fifa_id] = Date.parse(match.datetime))
    matches
      .filter(match => match.status === 'completed')
      .forEach(match => delete this.schedule[match.fifa_id])
  }

  throttle() {
    // no rate limit during the game
    if (this.inProgress()) {
      return true
    }

    // rate limit to one tenth
    if (--this.countdown < 1) {
      this.countdown = this.rate
      return true
    }

    return false
  }
}


class WorldCupTicker {

  constructor(wcApi, dkApi) {
    this.wcApi = wcApi || 'http://worldcup.sfg.io/matches/today'
    this.dkApi = dkApi || 'http://duino-k.local/led/matrix/message'
    this.status = {}
    this.events = new Set()
    this.throttle = new WorldCupThrottle()
  }

  async onTick() {
    debug('onTick')
    if (this.throttle.throttle()) {
      try {
        await this.update()
      } catch (e) {
        console.error(e)
      }
    }
  }

  async update() {
    debug('update')
    const matches = await this.fetchTodayMatches()
    const ids = matches.map(match => match.fifa_id)
    this.throttle.updateSchedule(matches)

    // clear old matches
    Object.keys(this.status)
      .filter(id => ids.indexOf(id) === -1)
      .forEach(id => delete this.status[id])

    // add new matches
    ids.filter(id => !this.status[id])
      .forEach(id => this.status[id] = 'future')

    matches.forEach(async match => {
      const status = this.status[match.fifa_id]
      this.status[match.fifa_id] = match.status

      if (match.status !== status && match.status === 'in progress') {
        await this.onMatchBegin(match)
      }

      if (match.status === 'in progress' || status === 'in progress') {
        this.collectEvent(match, match.home_team, match.home_team_events)
        this.collectEvent(match, match.away_team, match.away_team_events)
      }

      if (match.status !== status && match.status === 'completed') {
        await this.onMatchFinish(match)
        this.clearEvent(match.home_team_events)
        this.clearEvent(match.away_team_events)
      }
    })

    debug('updated', this.status, this.events, this.throttle.schedule)
  }

  async fetchTodayMatches() {
    const resp = await axios.get(this.wcApi)
    return resp.data
  }

  collectEvent(match, team, events) {
    events
      .filter(event => !this.events.has(event.id))
      .forEach(async event => {
        this.events.add(event.id)
        if (event.type_of_event.startsWith('goal')) {
          await this.onGoalEvent(match, team, event)
        } else {
          await this.onNewEvent(match, team, event)
        }
      })
  }

  clearEvent(events) {
    events.forEach(event => this.events.delete(event.id))
  }

  async onMatchBegin(match) {
    debug('onMatchBegin')
    await this.notify(
      `${match.status} ${match.home_team.country} vs ${match.away_team.country}`
    )
  }

  async onMatchFinish(match) {
    debug('onMatchFinish')
    await this.notify(
      `${match.status} ${match.home_team.country} vs ${match.away_team.country} ` +
      `${match.home_team.goals}-${match.away_team.goals}`
    )
  }

  async onNewEvent(match, team, event) {
    debug('onNewEvent')
    await this.notify(
      `${event.time} ${team.country} ${event.type_of_event} ${event.player}`
    )
  }

  async onGoalEvent(match, team, event) {
    debug('onGoalEvent')
    await this.notify(
      `${event.time} ${team.country} ${event.type_of_event} ${event.player}` +
      ' : ' +
      `${match.home_team.country} vs ${match.away_team.country} ` +
      `${match.home_team.goals}-${match.away_team.goals}`
    )
  }

  async notify(message) {
    debug('notify', message)
    try {
      await axios.get(this.dkApi, {params: {data: message}})
    } catch (e) {
      console.error(e)
    }
  }
}

module.exports = new WorldCupTicker()
