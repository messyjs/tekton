/**
 * Add a revision note to a brief's history.
 */
export function addRevision(brief, notes, changes) {
    const revision = {
        round: brief.revisionHistory.length + 1,
        directorNotes: notes,
        changesMade: changes,
        timestamp: Date.now(),
    };
    return {
        ...brief,
        revisionHistory: [...brief.revisionHistory, revision],
    };
}
/**
 * Get the number of revisions a brief has been through.
 */
export function getRevisionCount(brief) {
    return brief.revisionHistory.length;
}
/**
 * Get the latest revision note, or null if no revisions exist.
 */
export function getLatestRevision(brief) {
    if (brief.revisionHistory.length === 0)
        return null;
    return brief.revisionHistory[brief.revisionHistory.length - 1];
}
/**
 * Check if a brief has exceeded the maximum number of revisions.
 */
export function hasExceededMaxRevisions(brief, maxRevisions) {
    return brief.revisionHistory.length >= maxRevisions;
}
//# sourceMappingURL=revision-tracker.js.map