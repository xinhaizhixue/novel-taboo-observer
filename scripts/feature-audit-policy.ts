export interface GitCoverageInput {
  currentProjectLocalOnly: boolean;
  currentCommitCount: number;
  currentChapterCount: number;
  currentFileChanges: number;
  currentUiDiffVerified: boolean;
  fixtureGitCloneVerified: boolean;
}

/**
 * Capability evidence and the current author's repository policy are separate.
 * A local-only manuscript must not be committed merely to make an acceptance
 * matrix green; use a real portable fixture to prove Git/clone capability.
 */
export function policyAwareGitCoverage(input: GitCoverageInput) {
  if (input.currentProjectLocalOnly) {
    return {
      repoGit: input.currentChapterCount > 1 && input.fixtureGitCloneVerified,
      gitReview: input.currentFileChanges > 0 && input.currentUiDiffVerified,
      crossMachine: input.fixtureGitCloneVerified
    };
  }
  return {
    repoGit: input.currentCommitCount > 1 && input.currentChapterCount > 1,
    gitReview: input.currentCommitCount > 1 && input.currentFileChanges > 0,
    crossMachine: input.currentCommitCount > 1
  };
}
