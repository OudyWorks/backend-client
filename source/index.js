import EventEmitter from 'eventemitter3'
import param from 'jquery-param'

class BackendClient {
    static request(options) {
        let id = this.generateID()
        return new Promise(
            (resolve, reject) => {
                if(!options.method)
                    options.method = 'GET'
                if(options.method == 'GET' && options.data) {
                    if(Object.keys(options.data).length)
                        options.url += '?'+param(options.data)
                    delete options.data
                }
                console.log(options.url)
                this.events.once(id, resolve)
                fetch(options.url, {
                    method: options.method,
                    // body: JSON.stringify(options.data),
                    headers:{
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }).then(
                    response =>
                        this.events.emit(id, response.json())
                ).catch(reject)
            }
        )
    }
    static get(url, data = {}) {
        return this.request({
            method: 'GET',
            url,
            data
        })
    }
    static post(url, data = {}) {
        return this.request({
            method: 'POST',
            url,
            data
        })
    }
    static connect(url) {
        if(!url) {
            url = location.href.replace(location.pathname, '')
        }
        url = new URL(url)
        this.server = url.protocol+'//'+url.host
        return new Promise(
            (resolve, reject) => {

                if(WebSocket) {
                    this.websocket = new WebSocket(this.server.replace('http', 'ws'))
                    this.websocket.onmessage = message => {
                        message = JSON.parse(message.data)
                        if(message.request)
                            this.request({
                                ...message.request,
                                id: message.id
                            })
                        else
                            this.events.emit(message.id, message.response)
                    }
                    this.websocket.onopen = event =>
                        this.events.emit('open', event)
                    this.websocket.onerror = event =>
                        this.events.emit('error', reject)
                    this.websocket.onclose = event =>
                        this.events.emit('close', reject)
                    this.events.once('open', resolve)
                    this.events.once('error', reject)
                    this.events.once('close', reject)
                } else
                    resolve()

            }
        )
    }
    static generateID(length = 16) {
        let text = '',
            possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        for (let i = 0; i < length; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length))
        return text
    }
    static isInSocket() {
        return websocket && websocket.readyState == WebSocket.OPEN
    }
    static on() {
        return this.events.on.apply(this.events, arguments)
    }
    static once() {
        return this.events.once.apply(this.events, arguments)
    }
    static emit() {
        return this.events.emit.apply(this.events, arguments)
    }
    static removeListener() {
        return this.events.removeListener.apply(this.events, arguments)
    }
}

BackendClient.server = null
BackendClient.websocket = null
// BackendClient.request = Promise.resolve()
BackendClient.events = new EventEmitter()

export default BackendClient