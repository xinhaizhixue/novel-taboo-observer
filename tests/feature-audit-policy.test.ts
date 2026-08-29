import { describe, expect, it } from 'vitest';
import { policyAwareGitCoverage } from '../scripts/feature-audit-policy.js';

describe('功能审计的项目Git策略', () => {
  it('当前小说明确local-only时不为了验收强迫提交', () => {
    expect(policyAwareGitCoverage({
      currentProjectLocalOnly: true,
      currentCommitCount: 0,
      currentChapterCount: 13,
      currentFileChanges: 20,
      currentUiDiffVerified: true,
      fixtureGitCloneVerified: true
    })).toEqual({ repoGit: true, gitReview: true, crossMachine: true });
  });

  it('local-only仍要求真实可迁移fixture，不能把“不提交”冒充能力证明', () => {
    expect(policyAwareGitCoverage({
      currentProjectLocalOnly: true,
      currentCommitCount: 0,
      currentChapterCount: 13,
      currentFileChanges: 20,
      currentUiDiffVerified: true,
      fixtureGitCloneVerified: false
    })).toEqual({ repoGit: false, gitReview: true, crossMachine: false });
  });

  it('普通检查点策略继续要求当前项目真实提交', () => {
    expect(policyAwareGitCoverage({
      currentProjectLocalOnly: false,
      currentCommitCount: 0,
      currentChapterCount: 13,
      currentFileChanges: 20,
      currentUiDiffVerified: true,
      fixtureGitCloneVerified: true
    })).toEqual({ repoGit: false, gitReview: false, crossMachine: false });
  });
});
