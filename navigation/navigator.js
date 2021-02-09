import React from 'react';

import { createStackNavigator } from 'react-navigation-stack';
import Home from '../screens/home'
import History from '../screens/history'
import CallScreen from '../screens/callScreen'


const Navigator = createStackNavigator({
    Home,
    History,
    CallScreen
    
}, {headerMode: 'none'})

// console.log(Navigator)
export default Navigator