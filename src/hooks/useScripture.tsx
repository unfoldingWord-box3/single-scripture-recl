// @ts-ignore
import { useEffect, useState } from 'react'
import _ from 'lodash'
import {
  core,
  useRsrc,
} from 'scripture-resources-rcl'
import {
  CONTENT_NOT_FOUND_ERROR,
  ERROR_STATE,
  INITIALIZED_STATE,
  INVALID_MANIFEST_ERROR,
  LOADING_STATE,
  MANIFEST_NOT_LOADED_ERROR,
  SCRIPTURE_NOT_LOADED_ERROR,
} from 'translation-helps-rcl'
import { getVerses } from 'bible-reference-range'
import { getResourceLink } from '../utils'
import {
  ServerConfig,
  ScriptureResource,
  ScriptureReference,
} from '../types'
import { parseResourceManifest } from './parseResourceManifest'

interface Props {
  /** reference for scripture **/
  reference: ScriptureReference;
  /** where to get data **/
  config: ServerConfig;
  /** optional direct path to bible resource, in format ${owner}/${languageId}/${projectId}/${branch} **/
  resourceLink: string|undefined;
  /** optional resource object to use to build resourceLink **/
  resource: ScriptureResource|undefined;
}

export function useScripture({
  config,
  reference,
  resource: resource_,
  resourceLink: resourceLink_,
} : Props) {
  const [initialized, setInitialized] = useState(false)
  const [bookObjects, setBookObjects] = useState(null)
  const [versesForRef, setVersesForRef] = useState(null)
  let resourceLink = resourceLink_

  if (!resourceLink_ && resource_) {
    const {
      owner,
      languageId,
      projectId,
      branch = 'master',
      ref = null,
    } = resource_ || {}
    const ref_ = ref || branch
    resourceLink = getResourceLink({
      owner,
      languageId,
      resourceId: projectId,
      ref: ref_,
    })
  }

  const options = { getBibleJson: true }

  const {
    state: {
      bibleJson,
      matchedVerse,
      resource,
      content,
      loadingResource,
      loadingContent,
      fetchResponse,
    },
  } = useRsrc({
    config, reference, resourceLink, options,
  })

  const { title, version } = parseResourceManifest(resource)
  let { verseObjects } = bibleJson || {}
  const { languageId } = resource_ || {}
  const loading = loadingResource || loadingContent
  const contentNotFoundError = !content
  const scriptureNotLoadedError = !bibleJson
  const manifestNotFoundError = !resource?.manifest
  const invalidManifestError = !title || !version || !languageId
  const error = initialized && !loading &&
    (contentNotFoundError || scriptureNotLoadedError || manifestNotFoundError || invalidManifestError)
  const resourceStatus = {
    [LOADING_STATE]: loading,
    [CONTENT_NOT_FOUND_ERROR]: contentNotFoundError,
    [SCRIPTURE_NOT_LOADED_ERROR]: scriptureNotLoadedError,
    [MANIFEST_NOT_LOADED_ERROR]: manifestNotFoundError,
    [INVALID_MANIFEST_ERROR]: invalidManifestError,
    [ERROR_STATE]: error,
    [INITIALIZED_STATE]: initialized,
  }

  useEffect(() => {
    if (!initialized) {
      if (loading) { // once first load has begun, we are initialized
        setInitialized(true)
      }
    }
  }, [loading])

  function getVersesForRef(ref, content_ = bookObjects) {
    if (content_) {
      let verses = getVerses(content_.chapters, ref)

      if (languageId === 'el-x-koine' || languageId === 'hbo') {
        verses = verses.map(verse => {
          if (verse.verseObjects) {
            const verseObjects_ = core.occurrenceInjectVerseObjects(verse.verseObjects)
            verse.verseObjects = verseObjects_
          }
          return verse
        })
      }

      return verses
    }
    return null
  }

  function updateVerse(chapter, verse, verseData) {
    if (bookObjects) {
      const bookObjects_ = { ...bookObjects } // shallow cope

      if (bookObjects_?.chapters) {
        bookObjects_.chapters = { ...bookObjects_.chapters } // shallow copy

        if (bookObjects_.chapters[chapter]) {
          bookObjects_.chapters[chapter] = { ...bookObjects_.chapters[chapter] } // shallow copy
          bookObjects_.chapters[chapter][verse] = verseData
          setBookObjects(bookObjects_)
        }
      }
    }
    return null
  }

  useEffect(() => {
    if (bookObjects) {
      const ref = `${reference.chapter}:${reference.verse}`
      const versesForRef = getVersesForRef(ref, bookObjects)
      setVersesForRef(versesForRef)
    } else {
      setVersesForRef(null)
    }
  }, [bookObjects])

  useEffect(() => {
    setBookObjects(content)
  }, [content])

  if (languageId === 'el-x-koine' || languageId === 'hbo') {
    verseObjects = core.occurrenceInjectVerseObjects(verseObjects)
  }

  return {
    title,
    version,
    reference,
    resourceLink,
    matchedVerse,
    verseObjects,
    bookObjects,
    resourceStatus,
    fetchResponse,
    setBookObjects,
    getVersesForRef,
    versesForRef,
    updateVerse,
  }
}
