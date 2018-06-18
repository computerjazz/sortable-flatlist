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
  TouchableOpacity,
} from 'react-native';

import SortableFlatList from './SortableFlatList'
import SortableListView from './SortableListView'

const initialData = Array.from({ length: 50 }).fill(0).map((d, index) => ({
  color: `rgb(${Math.floor(Math.random() * 255)}, ${index * 5}, ${132})`,
  label: index,
  key: `data-key${index}`,
  height: 75 + Math.random() * 50
}))

export default class App extends Component {
  state = {
    data: initialData,
  }

  renderFlatListItem = ({ item, index, move, isActive, moveEnd }) => {
    return (
      <TouchableOpacity
        key={`myItem-${this.state.data[index].key}`}
        onLongPress={move}
        onPressOut={moveEnd}
        style={[styles.item, { backgroundColor: item.color, height: item.height }, isActive && styles.active]}>
        <Text style={styles.label}>{item.label}</Text>
      </TouchableOpacity>
    )
  }

  renderFlatList = () => {
    return (
      <SortableFlatList
        data={this.state.data}
        renderItem={this.renderFlatListItem}
        onMoveEnd={({ data, from, to, row }) => {
          console.log('MOVE END', from, to, row, data)
          this.setState({ data })
        }}
      />
    )
  }

  renderListView = () => {
    console.log('lv', this.state)
    return (
      <SortableListView
        data={this.state.data.reduce((acc, cur) => {
          acc[cur.key] = { label: cur.label, color: cur.color }
          return acc
        }, {})}
        activeOpacity={1}
        order={this.state.data.map(d => d.key)}
        renderRow={this.renderListViewItem}
        onRowMoved={this.onListViewItemMoved}
        activeStyle={styles.active}
      />
    )
  }

  renderListViewItem = (item) => {
    return <ListViewItem item={item} />
  }

  onListViewItemMoved = console.log

  render() {
    return (
      <View style={styles.container}>
        {this.renderFlatList()}
        {this.renderListView()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
    flexDirection: 'row',
  },
  active: {
    elevation: 5,
    backgroundColor: 'blue',
    shadowColor: 'black',
    shadowOpacity: 0.4,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowRadius: 3,
  },
  item: {
    height: 100,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: 'white',
    fontWeight: '800',
    fontSize: 30,
  }
});

class ListViewItem extends Component {
  render() {
    const { sortHandlers, item } = this.props
    return (
      <TouchableOpacity 
        {...sortHandlers}
        style={[styles.item, { backgroundColor: item.color }]}
      >
        <Text style={styles.label}>{item.label}</Text>
      </TouchableOpacity>
    )
  }
}