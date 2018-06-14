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

const initialData = Array.from({ length: 5 }).fill(0).map((d, index) => ({
  color: `rgb(${Math.floor(Math.random() * 255)}, ${index * 5}, ${132})`,
  label: index,
  key: `data-key${index}`,
}))

export default class App extends Component {
  state = {
    data: initialData,
  }

  renderFlatListItem = ({ item, index, setRef, move, isActive }) => {
    return (
      <TouchableOpacity
        key={`myItem-${this.state.data[index].key}`}
        ref={setRef}
        onLongPress={move}
        style={[styles.item, { backgroundColor: item.color }, isActive && styles.active]}>
        <Text style={styles.label}>{item.label}</Text>
      </TouchableOpacity>
    )
  }

  renderFlatList = () => {
    return (
      <SortableFlatList
        data={this.state.data}
        renderItem={this.renderFlatListItem}
        onRowActive={(row) => console.log('active!')}
        onMoveEnd={({ data, from, to, row }) => {
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
          acc[cur.key] = cur
          return acc
        }, {})}
        order={this.state.data.map(d => d.key)}
        renderRow={this.renderListViewItem}
        onRowMoved={this.onListViewItemMoved}
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
    console.log(this.props)
    const { sortHandlers, item } = this.props
    return (
      <TouchableOpacity 
        {...sortHandlers}
        style={[styles.item, { backgroundColor: 'blue'}]}
      >
        <Text>{item.label}</Text>
      </TouchableOpacity>
    )
  }
}