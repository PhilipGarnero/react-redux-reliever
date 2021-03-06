# react-redux-reliever

[![npm version](https://img.shields.io/npm/v/react-redux-reliever.svg?style=flat-square)](https://www.npmjs.com/package/react-redux-reliever)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

From redux's creator himself Dan Abramov :

> [Why is this stuff in five different files and constants SHOUTING at me](https://twitter.com/dan_abramov/status/1191487701058543617)


`react-redux-reliever` is a simple package that aims to relieve you from the pain of
opening multiple different files and write a lot of boring code each time you want to
add a small feature in your React app.

The principle is as follow : regroup all the logic from redux in a single file when
you're developing new features while defaulting to certain behaviors to save you some
time. You can easily override anything you don't like so you're not stuck either.

It obviously uses [react](https://github.com/facebook/react) and [redux](https://github.com/reactjs/redux).


# Getting started

## Install

```sh
$ npm install --save react-redux-reliever
```
or

```sh
$ yarn add react-redux-reliever
```

## Plugins
 * Rx: based on [redux-observable](https://github.com/redux-observable/redux-observable).
 ```javascript
    import RelieverRegistry, {plugins} from 'react-redux-reliever'

    RelieverRegistry.use(plugins.RxRelieverPlugin)
 ```
 * Saga: based on [redux-saga](https://github.com/redux-saga/redux-saga).
 ```javascript
    import RelieverRegistry, {plugins} from 'react-redux-reliever'

    RelieverRegistry.use(plugins.SagaRelieverPlugin)
 ```

You may also create your own plugins using the following interface.
```javascript
	class SomePlugin {
    		createMiddleware(reliever) {}
	        setupStore(store) {}
	}
    
    RelieverRegistry.use(SomePlugin)
```

## Usage Example

First, import `RelieverRegistry` and `Reliever`
```javascript
import RelieverRegistry, {Reliever} from 'react-redux-reliever'
```

Create a class that extends `Reliever`
```javascript
class ComponentReliever extends Reliever {
```

`ACTION_PREFIX` is used if you want to use the default behavior for the reducer which is
to check if the action type starts with this prefix and merges the action payload
(`action.payload = {}`) with the state if that's the case.  
Leave it out if you don't wish to use the default behavior.
```javascript
    ACTION_PREFIX = 'WHATEVER'
```

The initial state for the reducer. Note that it will be transformed to a [SeamlessImmutable](https://github.com/rtfeldman/seamless-immutable) object.
```javascript
    getInitialState() {
        return {
            value: null
        }
    }
```


`getActions` is where you define actions that could be used by other containers
(otherwise, simply use the payload)
```javascript
    getActions() {
        return {
            doSomething: () => ({type: 'WHATEVER_ACTION'}),
            doSomethingElse: () => ({type: 'WHATEVER_ACTION_ASYNC'})         
        }
    }
```

The reducer is not required but you can still override it. Here we have a mix between
the default `react-redux-reliever` behavior and the standard `redux` behavior.  
Don't forget that the state is a [SeamlessImmutable](https://github.com/rtfeldman/seamless-immutable/) object.  
The most frequent case for a mixed reducer is something needing to be added to some
value in the state.
```javascript
    reducer(state, action) {
        switch (action.type) {
            case 'WHATEVER_ADD':
                return state.set('value', state.value + "!")
            default:
                // Don't forget to call super
                return super.reducer(state, action)
        }
    }
}

export default ComponentReliever
```


## Using Rx

Create your `epics` (see [redux-observable](https://github.com/redux-observable/redux-observable)). All methods that have a name ending with 'Epic' will be used.
```javascript

    import {Reliever} from 'react-redux-reliever'
    import {flatMap} from 'rxjs/operators'
    import {defer, map, mapTo} from 'rxjs'

    class SomeReliever extends Reliever {

        someEpic(action$) {
            return action$
                .ofType('WHATEVER_ACTION') // takes every action of type 'WHATEVER_ACTION' from the action stream
                .pipe(mapTo({type: 'WHATEVER_UPDATE', payload: {value: 'foo'}})) // then maps the action to an action of type 'WHATEVER_UPDATE'. payload will be applied to the state automatically without using a reducer
        }

        // you can also easily handle async actions
        someAsyncEpic(action$) {
            return action$
                .ofType('WHATEVER_ACTION_ASYNC')
                .pipe(
                  flatMap(action =>
                    defer(async () => {
                      const result = await fetch(`https://some-api.com/foo?userId=${action.userId}`)
                      return await result.json()
                    })
                  ),
                  map(json => ({
                     type: 'WHATEVER_USER_DATA_FETCHED',
                     payload: {
                       userData: json.foo
                     }
                  }))
                )
        }
    }
```

`RxRelieverPlugin` also provides extensions for [rxjs](https://github.com/reactivex/rxjs)
to provide you with convenient methods to access and observe the `store` and `state`
```javascript
    import {plugins} from 'react-redux-reliever'
    const extensions = plugins.RxRelieverPlugin.extensions()
    extensions.getStore() // store observable, triggers once upon subscription
    extensions.getState() // state observable, triggers once upon subscription
    extensions.getState('substate') // substate observable, triggers once upon subscription
    extensions.observeState() // state observable, triggers when the state changes
    extensions.observeState('substate') // substate observable, triggers when the state changes
    extensions.reduxActionStream() // returns the global action stream
```

This allows you to build complex sequences of actions while leveraging the flexibility
and operators of [rxjs](https://github.com/reactivex/rxjs)

```javascript
    fooEpic(action$) {
        const shouldStop$ = extensions.observeState('substate').pipe(
            map(state => state.toMutable().someProp),
            filter(prop => prop === 'foo'), // this observable will trigger when the property someProp === 'foo'
            take(1) // unsubscribe once the filter operator has triggered
        )

        return action$.ofType('WHATEVER_FOO_ACTION').pipe(
            mapTo({type: 'WHATEVER_SOMETHING_ELSE'}),
            takeUntil(shouldStop$)
        )
    }
```

## Using saga

add a `*saga()` method to your reliever and add all your saga logic there

```javascript
import {takeLatest} from 'redux-saga/effects'

class MyReliever extends Reliever {
	*handleSomeAction(action) {
		// do something
	}
	
	*saga() {
		yield takeLatest('SOME_ACTION', this.handleSomeAction.bind(this))
	}
}
```

## Adding the store

in your store file
```javascript
import RelieverRegistry, {plugins} from "react-redux-reliever"
```
We can register our plugins and reliever(s) to the registry
```javascript
RelieverRegistry.register(ComponentReliever, "whatever")

RelieverRegistry.use(plugins.RxRelieverPlugin)
RelieverRegistry.use(plugins.SagaRelieverPlugin)
RelieverRegistry.use(MyOwnPlugin)
```

We can then use the registry to create the store and rootReducer like so
```javascript

const rootReducer = RelieverRegistry.buildRootReducer()

// You can pass an object to include other reducers you may have
// By default everything will be on the same level in your store but you can pass
// an extra argument to put reducers from the registry on another level
const rootReducer = RelieverRegistry.buildRootReducer({
    otherReducer: myOtherReducer
}, "customLevelInStore")

const store = createStore(RelieverRegistry.buildRootReducer(), applyMiddleware(...RelieverRegistry.middlewares(), logger))
RelieverRegistry.setupStore(store)
```

Now you can connect your component to the store.  

You can choose to do it the usual way or you can use our custom `connect` function.
In your `Component.js`, we import the necessary functions
```javascript
import RelieverRegistry, {connect} from "react-redux-reliever"
```

The connect function takes two named parameters : `props` and `functions`

`props` is exactly like `mapStateToProps` except that you also need to return `ownProps`
(that way you are able to easily remove unwanted props)
```javascript
    props(state, ownProps) {
        // moduleState is used to retrieve the module's state in the whole store
        return {value: RelieverRegistry.moduleState("whatever", state).get('value'), ...ownProps}
    }
```

`functions` is the same as `mapDispatchToProps` except that you have access to all the props returned by `props`.  
```javascript
    functions(ownProps, dispatch) {
        return {
            test: () => {
                // Note that we generally don't use action creators.
                // This is purely a choice and you can still use them if you want.
                dispatch({type: 'WHATEVER_TEST', payload: {value: "Looking good !"}})
            },
            doSomething: () => {
                // If you want to use action creators from a module, you could do so like that by using its name
                dispatch(RelieverRegistry.moduleActions("whatever").doSomething())
            }
        }
    }
```

In the end, `connect` is used like that
```javascript
export default connect({
    props: (state, ownProps) => {/* Your code here */},
    functions: (ownProps, dispatch) => {/* Your code here */}
})(Component)
```

That's it !

# Building examples from sources

```sh
$ git clone https://github.com/aronse/react-redux-reliever.git
$ cd react-redux-reliever
$ npm install
```

As of today, only a simple counter example has been implemented.

### Counter example

```sh
$ npm run counter
```

# Contributing

Feel free to open issues and submit pull-requests.
