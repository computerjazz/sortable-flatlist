/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' +
    'Cmd+D or shake for dev menu',
  android: 'Double tap R on your keyboard to reload,\n' +
    'Shake or press menu button for dev menu',
});

import SortableFlatList from './SortableFlatList'

type Props = {};
export default class App extends Component<Props> {
  state = {
    data: Array.from({ length: 50 }).fill(0).map((d, i) => ({ 
      color: `rgb(${i * 5},${i * 5},${i * 5})`,
      label: `item ${i}`,
    }))
  }
  render() {
    return (
      <View style={styles.container}>
        <SortableFlatList
          data={this.state.data}
          onHoverStart={() => console.log('hover')}
          onHoverEnd={() => console.log('hover end')}
          onDataSorted={(data, fromIndex, toIndex) => {
            console.log('Data', data)
            this.setState({ data })
          }}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    marginTop: 20,
    backgroundColor: '#F5FCFF',
  },
});
