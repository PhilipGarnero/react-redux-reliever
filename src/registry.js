import {combineReducers} from 'redux'

class RelieverRegistry {
  constructor() {
    if (!RelieverRegistry.instance) {
      this.modules = {}
      this.modulesRootReducerKey = undefined
      this.reducerConstructed = false
      RelieverRegistry.instance = this
      this.plugins = []
    }
    return RelieverRegistry.instance
  }

  setupStore(store) {
    this.plugins.forEach(plugin => plugin.instance.setupStore(store, plugin.options))
  }

  use(plugin, options) {
    this.plugins.push({instance: new plugin(), options})
    return this
  }

  register(reliever, moduleName, {reducerKey} = {}) {
    if (this.reducerConstructed) console.warn('You are registering a new module but the modules reducer has already been built. This should not happen.')
    const relievedComponent = new reliever()
    const reducer = relievedComponent.reducer.bind(relievedComponent)
    const actions = relievedComponent.getActions()
    reducerKey = reducerKey || moduleName
    this.modules[moduleName] = {reliever: relievedComponent, reducer, reducerKey, actions, name: moduleName}
  }

  changeModuleReducerKey(moduleName, reducerKey) {
    if (this.reducerConstructed) console.warn("Changing the modules reducer's keys after it has been built has no effect.")
    this.modules[moduleName].reducerKey = reducerKey
  }

  buildRootReducer(rootReducer = {}, modulesRootReducerKey = undefined) {
    if (this.reducerConstructed) console.warn('The reducer has already been built. This should not happen.')
    this.reducerConstructed = true
    const moduleReducers = Object.values(this.modules).reduce((r, m) => ({...r, [m.reducerKey]: m.reducer}), {})
    if (modulesRootReducerKey !== undefined) {
      this.modulesRootReducerKey = modulesRootReducerKey
      return combineReducers({...rootReducer, [modulesRootReducerKey]: combineReducers(moduleReducers)})
    }
    return combineReducers({...moduleReducers, ...rootReducer})
  }

  moduleState(moduleName, state) {
    if (this.modulesRootReducerKey) return state[this.modulesRootReducerKey][this.modules[moduleName].reducerKey]
    return state[this.modules[moduleName].reducerKey]
  }

  moduleActions(moduleName) {
    return this.modules[moduleName].actions
  }

  middlewares() {
    return this.plugins
      .map(plugin => {
        return Object.keys(this.modules)
          .map(key => this.modules[key])
          .map(module => plugin.instance.createMiddleware(module.reliever, plugin.options, module))
          .filter(middleware => middleware)
      })
      .reduce((p, c) => [...p, ...c], [])
  }
}

export default new RelieverRegistry()
