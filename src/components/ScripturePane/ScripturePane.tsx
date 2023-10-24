import * as React from 'react'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { VerseObjects } from 'scripture-resources-rcl'
import { UsfmFileConversionHelpers } from 'word-aligner-rcl'
import { ScriptureReference } from '../../types'
import {
  getResourceMessage,
  LOADING_RESOURCE,
  verseObjectsHaveWords,
} from '../../utils'
import { ScriptureALignmentEditProps, useScriptureAlignmentEdit } from '../../hooks/useScriptureAlignmentEdit'
import {
  Container,
  Content,
  EmptyContent,
} from './styled'

interface Props {
  /** optional styles to use for content **/
  contentStyle: any;
  // index number for this scripture pane
  currentIndex: number,
  // waiting to determine branch
  determiningBranch: boolean,
  /** language direction to use **/
  direction: string|undefined;
  /** if true then do not display lexicon popover on hover **/
  disableWordPopover: boolean|undefined;
  /** font size for messages */
  fontSize: number;
  /** function to get latest lexicon data */
  getLexiconData: Function;
  /** true if browsing NT */
  isNT: boolean;
  /** whether or not this current verse has been selected for alignment */
  isVerseSelectedForAlignment: boolean;
  /** function to be called when verse alignment has error */
  onAlignmentError: Function;
  /** function to be called when verse alignment has finished */
  onAlignmentFinish: Function;
  // original scripture bookObjects for current book
  originalScriptureBookObjects: object,
  /** current reference **/
  reference: ScriptureReference;
  /** optional styles to use for reference **/
  refStyle: any;
  /** object that contains resource loading status or fetching errors */
  resourceStatus: object|undefined;
  /** resource that was loaded */
  resourceLink: string|undefined;
  /** true if currently saving updated text and alignments */
  saving: boolean;
  // initialization for useScriptureAlignmentEdit
  scriptureAlignmentEditConfig: ScriptureALignmentEditProps,
  /** server */
  server: string|undefined;
  /** callback to flag unsaved status */
  setSavedChanges: Function;
  // callback for change in word alignment status
  setWordAlignerStatus: Function;
  /** optional function for localization */
  translate: Function;
  /** function to be called to update verse alignment status */
  updateVersesAlignmentStatus: Function;
}

const MessageStyle = {
  direction: 'ltr',
  whiteSpace: 'pre-wrap',
  lineHeight: 'normal',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  width: '100%',
  fontSize: '16px',
  fontFamily: 'Noto Sans',
  fontWeight: 'bold',
}

const TextAreaStyle = {
  height: '60%',
  width: '100%',
  minWidth: '220px',
  fontSize: '16px',
}

function ScripturePane({
  currentIndex,
  contentStyle,
  determiningBranch,
  direction,
  disableWordPopover,
  fontSize,
  getLexiconData,
  isNT,
  isVerseSelectedForAlignment,
  onAlignmentError,
  onAlignmentFinish,
  originalScriptureBookObjects,
  reference,
  refStyle,
  resourceStatus,
  resourceLink,
  saving,
  scriptureAlignmentEditConfig,
  setSavedChanges,
  setWordAlignerStatus,
  server,
  translate,
  updateVersesAlignmentStatus,
} : Props) {
  const [state, setState_] = React.useState({
    doingAlignment: false,
    newText: null,
    errorMessage: null,
  })
  const {
    doingAlignment,
    newText,
    errorMessage,
  } = state

  function setState(newState) {
    setState_(prevState => ({ ...prevState, ...newState }))
  }

  const [initialVerseText, setInitialVerseText] = React.useState(null)

  let resourceMessage = ''

  if (saving) {
    resourceMessage = 'Saving Changes...'
  } else if (determiningBranch) {
    resourceMessage = 'Pre-' + LOADING_RESOURCE
  } else {
    resourceMessage = getResourceMessage(resourceStatus, server, resourceLink, isNT)
  }

  const {
    chapter,
    projectId,
    verse,
  } = reference
  direction = direction || 'ltr'
  const basicReference = {
    chapter,
    verse,
    projectId,
  }

  refStyle = refStyle || {
    fontFamily: 'Noto Sans',
    fontSize: '90%',
  }

  contentStyle = contentStyle || {
    fontFamily: 'Noto Sans',
    fontSize: '100%',
  }

  const _scriptureAlignmentEditConfig = {
    ...scriptureAlignmentEditConfig,
    initialVerseText,
    originalScriptureBookObjects,
  }

  const _scriptureAlignmentEdit = useScriptureAlignmentEdit(_scriptureAlignmentEditConfig)
  const {
    actions: {
      clearChanges,
      handleAlignmentClick,
      isOkToAlign,
      setEditing,
      setVerseChanged,
    },
    state: {
      aligned,
      alignerData,
      currentVerseObjects,
      editing,
      enableEdit,
      initialVerseObjects,
      newVerseText,
    },
  } = _scriptureAlignmentEdit

  React.useEffect(() => {
    if (isVerseSelectedForAlignment && !alignerData && !doingAlignment && !errorMessage) {
      console.log(`ScripturePane - verse selected for alignment`, basicReference)
      const status = isOkToAlign()
      const errorMessage_ = status?.errorMessage

      if (errorMessage_) {
        setState({ errorMessage: errorMessage_ })
        onAlignmentError && onAlignmentError(errorMessage_)
      } else {
        handleAlignmentClick()
      }
    }
  }, [isVerseSelectedForAlignment, alignerData, doingAlignment, errorMessage])

  // const verseChanged = React.useMemo(() => {
  //   return (newVerseText !== newText)
  // }, [newVerseText, newText])
  //
  // React.useEffect(() => {
  //   if (newVerseText !== newText) {
  //     console.log(`ScripturePane - new verse text diverged`, { newVerseText, newText })
  //   } else {
  //     console.log(`ScripturePane - new verse text converged`, { newVerseText })
  //   }
  // }, [verseChanged])

  React.useEffect(() => {
    updateVersesAlignmentStatus && updateVersesAlignmentStatus(reference, aligned)
  }, [aligned, chapter, verse, projectId])

  React.useEffect(() => {
    if (alignerData && !doingAlignment) {
      setWordAlignerStatus && setWordAlignerStatus(_scriptureAlignmentEdit)
      setState({ doingAlignment: true })
    } else {
      if (!doingAlignment) {
        console.log(`ScripturePane - alignerData went false unexpected`, { basicReference, alignerData, doingAlignment })
      }

      setWordAlignerStatus && setWordAlignerStatus(_scriptureAlignmentEdit)
      setState({ doingAlignment: false })
      onAlignmentFinish && onAlignmentFinish()
    }
  }, [_scriptureAlignmentEdit?.state?.alignerData])

  // dynamically adjust font size
  const calculatedFontSize = React.useMemo(() => (
    parseFloat(TextAreaStyle.fontSize) * fontSize / 100 + 'px'
  ), [fontSize])

  const textAreaStyle = {
    ...contentStyle,
    ...TextAreaStyle,
    fontSize: calculatedFontSize,
  }

  useDeepCompareEffect(() => {
    const verseText = UsfmFileConversionHelpers.getUsfmForVerseContent({ verseObjects: initialVerseObjects })
    clearChanges()
    setInitialVerseText(verseText)
    setState({ newText: null, errorMessage: null })
  }, [{ basicReference, initialVerseObjects }])

  function onTextChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const newVerseText = event?.target?.value
    const changed = newVerseText !== initialVerseText
    // console.log(`SP.onTextChange`, { changed, newText: newVerseText, initialVerseText })
    setVerseChanged(changed, newVerseText, initialVerseText)
    setState({ newText: newVerseText })
  }

  function onBlur(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setEditing(false, newText)
  }

  const verseObjects = currentVerseObjects || initialVerseObjects
  const noWords = React.useMemo(() => !verseObjectsHaveWords(verseObjects), [currentVerseObjects, initialVerseObjects])

  /**
   * determine what to show based on variables
   * @param {boolean} editing - if true show edit mode
   * @param {boolean} enableEdit - if true then edit is enabled
   * @param {boolean} noWords - if true then there are no displayable words
   */
  function verseContent(editing, enableEdit, noWords) {
    if (editing) {
      return <textarea
        defaultValue={newVerseText || initialVerseText}
        onChange={onTextChange}
        onBlur={onBlur}
        style={textAreaStyle}
        autoFocus
      />
    }

    if (noWords && enableEdit) {
      return <EmptyContent>
        Click to Edit
      </EmptyContent>

    }
    return <VerseObjects
      verseKey={`${reference.chapter}:${reference.verse}`}
      verseObjects={verseObjects}
      disableWordPopover={disableWordPopover}
      getLexiconData={getLexiconData}
      translate={translate}
    />
  }

  return (
    <Container style={{ direction, width: '100%', paddingBottom: '0.5em' }}>
      {resourceMessage ?
        // @ts-ignore
        <div style={MessageStyle}>
          <div style={{ fontSize: `${fontSize}%` }}> {resourceMessage} </div>
        </div>
        :
        <Content>
          <span style={refStyle}> {chapter}:{verse}&nbsp;</span>
          <span style={contentStyle} onClick={() => {
            setEditing && setEditing(true)
          }}
          >
            {verseContent(editing, enableEdit, noWords)}
          </span>
        </Content>
      }
    </Container>
  )
}

ScripturePane.defaultProps = { verseObjects: [] }

export default ScripturePane
