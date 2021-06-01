import React, { useState } from 'react'
import { Text, StyleSheet, TextInputProps } from 'react-native'
import utils from './utils'

type InputProps = {
  renderMention?: (user: User, pos: Selection) => Renderable
  trigger?: string
  initialValue?: string
}

type Selection = { start: number; end: number }
type User = { id: string; name: string; username: string }
type Renderable = string | JSX.Element

const defaultProps = {
  trigger: '@',
  initialValue: ''
}

type MentionsInputReturn = [
  TextInputProps & {
    children: Renderable | Renderable[]
  },
  {
    isMentioning: boolean
    keyword: string
    onSuggestionPick: (user: User) => void
    inputText: string
    rawText: string
    setRawText: (t: string) => void
  }
]

type State = {
  mentionsMap: Map<[number, number], User>
  formattedText: Renderable | Renderable[]
  selection: Selection
  inputText: string
  isMentioning: boolean
  keyword: string
  mentionPosition?: number
}

const defaultState = {
  mentionsMap: new Map(),
  formattedText: [],
  inputText: '',
  isMentioning: false,
  keyword: '',
  selection: {
    start: 0,
    end: 0
  }
}

export const useMentionsInput = (props: InputProps = defaultProps): MentionsInputReturn => {
  const [state, setState] = useState<State>(() =>
  ({
    ...defaultState,
    mentionsMap: utils.getMentionsWithInputText(props?.initialValue)?.map,
    inputText: utils.getMentionsWithInputText(props?.initialValue)?.newValue,
    formattedText: props?.initialValue
  })
  )

  const setRawText = (t: string) => {
    const newState: State = { ...defaultState }
    const newMaps = utils.getMentionsWithInputText(t)
    if (!newMaps) {
      setState(newState)
      return
    }
    const { map, newValue } = newMaps
    newState.mentionsMap = map
    newState.inputText = newValue
    newState.formattedText = formatText(newState)
    newState.selection = {
      start: t.length - 1,
      end: t.length - 1
    }
    setState(newState)
  }

  const getInitialAndRemainingStrings = (inputText: string, menIndex: number) => {
    /**
     * extractInitialAndRemainingStrings
     * this function extract the initialStr and remainingStr
     * at the point of new Mention string.
     * Also updates the remaining string if there
     * are any adjcent mentions text with the new one.
     */
    let initialStr = inputText.substr(0, menIndex).trim()
    if (!utils.isEmpty(initialStr)) {
      initialStr = `${initialStr} `
    }
    /**
     * remove the characters adjcent with @ sign
     * and extract the remaining part
     */
    let remStr =
      inputText
        .substr(menIndex + 1)
        .replace(/\s+/, '\x01')
        .split('\x01')[1] || ''

    /**
     * check if there are any adjecent mentions
     * subtracted in current selection.
     * add the adjcent mentions
     * @tim@nic
     * add nic back
     */
    const adjMentIndexes = {
      start: initialStr.length - 1,
      end: inputText.length - remStr.length - 1
    }
    const mentionKeys = utils.getSelectedMentionKeys(state.mentionsMap, adjMentIndexes)
    mentionKeys.forEach(key => {
      remStr = `@${state.mentionsMap.get(key)!.username} ${remStr}`
    })
    return {
      initialStr,
      remStr
    }
  }

  const onSuggestionPick = (user: User) => {
    const { initialStr, remStr } = getInitialAndRemainingStrings(state.inputText, state.mentionPosition!)

    const username = `@${user.username}`
    const text = `${initialStr}${username} ${remStr}`
    // '@[__display__](__id__)' ///find this trigger parsing from react-mentions

    // set the mentions in the map.
    const menStartIndex = initialStr.length
    const menEndIndex = menStartIndex + (username.length - 1)

    state.mentionsMap.set([menStartIndex, menEndIndex], user)

    // update remaining mentions indexes
    const charAdded = Math.abs(text.length - state.inputText.length)
    const mentionsMap = updatedMentionsMap(
      state,
      {
        start: menEndIndex + 1,
        end: text.length
      },
      charAdded,
      true
    )

    setState({
      ...state,
      mentionsMap,
      inputText: text,
      formattedText: formatText({
        ...state,
        inputText: text
      }),
      isMentioning: false
    })
  }

  const updatedMentionsMap = (currentState: State, selection: Selection, count: number, shouldAdd: boolean) =>
    utils.updateRemainingMentionsIndexes(currentState.mentionsMap, selection, count, shouldAdd)

  const checkForMention = (currentState: State, inputText: string, selection: Selection): State => {
    const newState = { ...currentState }
    /**
     * Open mentions list if user
     * start typing @ in the string anywhere.
     */
    const mentionIndex = selection.start - 1
    const lastChar = inputText.substr(mentionIndex, 1)
    if (lastChar === props.trigger) {
      newState.mentionPosition = mentionIndex
      newState.isMentioning = true
      newState.keyword = ''
    } else if (lastChar.trim() === '' && newState.isMentioning) {
      newState.isMentioning = false
    }
    /**
     * filter the mentions list
     * according to what user type with
     * @ char e.g. @billroy
     */
    if (newState.isMentioning && typeof newState.mentionPosition !== 'undefined') {
      const pattern = new RegExp(`\\${props.trigger}[a-z0-9_-]+|\\${props.trigger}`, 'i')
      const str = inputText.substr(newState.mentionPosition)
      const keywordArray = str.match(pattern)
      if (keywordArray && !!keywordArray.length) {
        const lastKeyword = keywordArray[keywordArray.length - 1]
        newState.keyword = lastKeyword
      }
    }
    return newState
  }

  const onSelectionChange = ({ nativeEvent: { selection } }) => {
    const prevSelc = state.selection
    let newSelc: Selection = { ...selection }
    if (newSelc.start !== newSelc.end) {
      newSelc = utils.addMenInSelection(newSelc, prevSelc, state.mentionsMap)
    }
    if (prevSelc.start !== newSelc.start || prevSelc.end !== newSelc.end) setState({ ...state, selection: newSelc })
  }

  const formatMentionNode = (user: User, pos: Selection): Renderable => {
    if (props.renderMention) {
      return props.renderMention(user, pos)
    }
    // Default style:
    return (
      <Text key={`${pos.start}-${user.id}-${pos.end}`} style={styles.mention}>
        {`@${user.username}`}
      </Text>
    )
  }

  /**
   * Get current input text with styled mentions.
   * @param state The current state
   * @param renderMention The adapter function to style a mention.
   *  When null, applies some default style.
   */
  const formatText = (
    { inputText, mentionsMap }: State,
    renderMention: (user: User, pos: Selection) => Renderable = formatMentionNode
  ): Renderable[] => {
    if (inputText === '' || !mentionsMap?.size) return [inputText]
    const formattedText: any[] = []
    let lastIndex = 0
    mentionsMap.forEach((user, [start, end]) => {
      const initialStr = start === 1 ? '' : inputText.substring(lastIndex, start)
      lastIndex = end + 1
      if (initialStr && initialStr.length > 0) formattedText.push(initialStr)
      const formattedMention = renderMention(user, { start, end })
      formattedText.push(formattedMention)
      if (utils.isKeysAreSame(utils.getLastKeyInMap(mentionsMap), [start, end])) {
        const lastStr = inputText.substr(lastIndex) // remaining string
        formattedText.push(lastStr)
      }
    })
    return formattedText
  }

  const onChangeText = (text: string) => {
    let newState = { ...state }
    const prevText = newState.inputText
    const selection = newState.selection

    if (text.length < prevText.length) {
      /**
       * if user is back pressing and it
       * deletes the mention remove it from
       * actual string.
       */

      let charDeleted = Math.abs(text.length - prevText.length)
      const totalSelection = {
        start: selection.start,
        end: charDeleted > 1 ? selection.start + charDeleted : selection.start
      }
      /**
       * Remove all the selected mentions
       */
      if (totalSelection.start === totalSelection.end) {
        // single char deleting
        const key = utils.findMentionKeyInMap(newState.mentionsMap, totalSelection.start)
        if (key && key.length) {
          newState.mentionsMap.delete(key)
          /**
           * don't need to worry about multi-char selection
           * because our selection automatically select the
           * whole mention string.
           */
          const initial = text.substring(0, key[0]) // mention start index
          text = initial + text.substr(key[1]) // mentions end index
          charDeleted = charDeleted + Math.abs(key[0] - key[1]) // 1 is already added in the charDeleted
          newState.mentionsMap.delete(key)
        }
      } else {
        // multi-char deleted
        const mentionKeys = utils.getSelectedMentionKeys(newState.mentionsMap, totalSelection)
        mentionKeys.forEach(key => {
          newState.mentionsMap.delete(key)
        })
      }
      /**
       * update indexes on charcters remove
       * no need to worry about totalSelection End.
       * We already removed deleted mentions from the actual string.
       */
      newState.mentionsMap = updatedMentionsMap(
        newState,
        {
          start: selection.end,
          end: prevText.length
        },
        charDeleted,
        false
      )
    } else {
      // update indexes on new charcter add
      const charAdded = Math.abs(text.length - prevText.length)
      newState.mentionsMap = updatedMentionsMap(
        newState,
        {
          start: selection.end,
          end: text.length
        },
        charAdded,
        true
      )
      /**
       * if user type anything on the mention
       * remove the mention from the mentions array
       */
      if (selection.start === selection.end) {
        const key = utils.findMentionKeyInMap(newState.mentionsMap, selection.start - 1)
        if (key && key.length) {
          newState.mentionsMap.delete(key)
        }
      }
    }

    newState.inputText = text
    newState.formattedText = formatText(newState)
    newState = checkForMention(newState, text, selection)
    setState(newState)
  }

  const rawText = formatText(state, user => `@[${user.username}](id:${user.id})`).join('')

  return [
    {
      children: state.formattedText,
      onChangeText,
      onSelectionChange,
      selection: state.selection
    },
    {
      isMentioning: state.isMentioning,
      keyword: state.keyword,
      onSuggestionPick,
      inputText: state.inputText,
      rawText,
      setRawText
    }
  ]
}

const styles = StyleSheet.create({
  mention: {
    fontSize: 16,
    fontWeight: '400',
    backgroundColor: 'rgba(36, 77, 201, 0.05)',
    color: '#244dc9'
  }
})
