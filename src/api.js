import config from './config'

const api = {
    get(path) {
        return fetch(`${config.BASE_URL}${path}`, { credentials: 'include' })
    },
    post(path, body) {
        return fetch(`${config.BASE_URL}${path}`, {
            method: 'POST',
            credentials: 'include',
            ...(body !== undefined && {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }),
        })
    },
    put(path, body) {
        return fetch(`${config.BASE_URL}${path}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
    },
    patch(path, body) {
        return fetch(`${config.BASE_URL}${path}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
    },
    delete(path) {
        return fetch(`${config.BASE_URL}${path}`, {
            method: 'DELETE',
            credentials: 'include',
        })
    },
}

export default api