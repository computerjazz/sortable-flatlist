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
  TouchableOpacity
} from 'react-native';

import SortableFlatList from './SortableFlatList'

const initialData = Array.from({ length: 50 }).fill(0).map((d, index) => ({
  color: `rgba(${Math.floor(Math.random() * 255)}, ${index * 5}, ${132}, ${0.5})`,
  index,
}))

export default class App extends Component {
  state = {
    data: initialData,
  }

  renderItem = ({ item, index, itemRef, beginSort, isActive }) => {
    return (
      <TouchableOpacity
        ref={itemRef}
        onLongPress={beginSort}
        style={[{
          height: 100,
          width: '100%',
          backgroundColor: item.color,
        }, isActive && {
          elevation: 5,
          shadowColor: 'black',
          shadowOpacity: 0.4,
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowRadius: 3,
        }]}>
        <Text>{item.index}</Text>
      </TouchableOpacity>
    )
  }

  render() {
    return (
      <View style={styles.container}>
        <SortableFlatList
          data={this.state.data}
          renderItem={this.renderItem}
          onRowActive={(row) => console.log('active!')}
          onMoveEnd={({ data, from, to, row }) => {
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

    backgroundColor: '#F5FCFF',
  },
});
