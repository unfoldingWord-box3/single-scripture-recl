import { useEffect } from 'react'
import { useScripture } from '..'
import { getScriptureResourceSettings } from '../utils/ScriptureSettings'

/**
 * hook to get a scripture resource
 * @param {string} bookId
 * @param {object} scriptureSettings - info about the scripture being referenced
 * @param {string} chapter
 * @param {string} verse
 * @param {boolean} isNewTestament
 * @param {string} originalRepoUrl - optional path to repo for original language
 * @param {string} currentLanguageId - optional over-ride for transient case where language in scripture settings have not yet updated
 * @param {string} currentOwner - optional over-ride for transient case where owner in scripture settings have not yet updated
 * @param {object} httpConfig - optional config settings for fetches (timeout, cache, etc.)
 * @param {string} appRef - app default, points to specific ref that could be a branch or tag
 * @param {boolean} wholeBook - if true then fetch the entire book
 * @param {boolean} fetchReady - true if ready for fetching
 */
export function useScriptureResources({
  bookId,
  scriptureSettings,
  chapter,
  verse,
  isNewTestament,
  originalRepoUrl,
  currentLanguageId = null,
  currentOwner = null,
  httpConfig = {},
  appRef = 'master',
  wholeBook = false,
  fetchReady = false,
}) {
  if (appRef !== scriptureSettings.ref) {
    scriptureSettings = { ...scriptureSettings, ref: appRef }
  }

  useEffect(() => {
    console.log(`useScriptureResources: appRef changed to scriptureSettings.ref=${scriptureSettings.ref} and appRef=${appRef}`)
  }, [appRef, scriptureSettings.ref])

  const scriptureSettings_ = getScriptureResourceSettings(bookId, scriptureSettings, isNewTestament,
    originalRepoUrl, currentLanguageId, currentOwner) // convert any default settings strings

  let resource = fetchReady ? {
    languageId: scriptureSettings_.languageId,
    projectId: scriptureSettings_.resourceId,
    owner: scriptureSettings_.owner,
    ref: scriptureSettings_.ref || scriptureSettings_.branch || appRef,
  } : null

  const scriptureConfig_ = {
    reference: {
      projectId: bookId,
      chapter: chapter,
      verse: verse,
    },
    resource,
    resourceLink: scriptureSettings_.resourceLink,
    config: {
      server: scriptureSettings_.server,
      ...httpConfig,
    },
    disableWordPopover: scriptureSettings_.disableWordPopover,
    wholeBook,
  }

  // @ts-ignore
  const scriptureResource = useScripture(scriptureConfig_)
  // restore any default settings
  scriptureResource.resourceLink = scriptureSettings.resourceLink

  if (!scriptureResource['resource']) { // keep resource if not returned
    scriptureResource['resource'] = scriptureConfig_.resource
  }

  return scriptureResource
}

export default useScriptureResources
