import EventEmitter from 'eventemitter3'
import param from 'jquery-param'
import serialize from 'form-serialize'

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
                this.events[options.subscribe ? 'on' : 'once'](id, options.resolve || resolve)
                let body = undefined,
                    headers = new Headers(options.headers || {'Accept': 'application/json'})
                if(options.data) {
                    if(options.data.constructor)
                        switch (options.data.constructor.name) {
                            case 'Object':
                                body = options.data
                                headers.append('Content-Type', 'application/json')
                                break
                            case 'URLSearchParams':
                            case 'FormData':
                            case 'Blob':
                                body = options.data
                                break
                            case 'HTMLFormElement':
                                // body = new URLSearchParams(new FormData(options.data))
                                body = serialize(options.data, { hash: true, empty: true })
                                headers.append('Content-Type', 'application/json')
                                break
                        }
                }
                if(this.websocket && this.websocket.readyState == WebSocket.OPEN)
                    this.websocket.send(JSON.stringify({
                        id,
                        method: options.method,
                        url: options.url,
                        body
                    }))
                else {
                    if(body)
                        body = body.constructor.name == 'Object' ? JSON.stringify(body) : body
                    fetch(options.url, {
                        credentials: 'same-origin',
                        method: options.method,
                        body,
                        headers
                    }).then(
                        response =>
                            this.events.emit(id, response.json())
                    ).catch(reject)
                }
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