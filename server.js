const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

let skills = [];
let skillIdCounter = 1;

// Decay simulation: reduce proficiency every 10 seconds
setInterval(() => {
  skills.forEach(skill => {
    skill.proficiency = Math.max(0, skill.proficiency - skill.decay_rate * 100); // Decay based on rate
  });
}, 10000);

app.get('/api/skills', (req, res) => {
  res.json(skills);
});

app.post('/api/add-skill', (req, res) => {
  const { name, decay_rate, github_repo, github_token, initial_proficiency } = req.body;
  const newSkill = {
    id: skillIdCounter++,
    name,
    decay_rate,
    github_repo,
    github_token,
    proficiency: initial_proficiency || 100, // Initial progress
    last_commit: null
  };
  skills.push(newSkill);
  res.json({ message: 'Skill added successfully' });
});

app.post('/api/sync-github', async (req, res) => {
  const { skillId, repoPath } = req.body;
  console.log('Sync request for skillId:', skillId, 'repo:', repoPath);
  const skill = skills.find(s => s.id === skillId);
  if (!skill) {
    console.log('Skill not found');
    return res.status(404).json({ message: 'Skill not found' });
  }

  const url = `https://api.github.com/repos/${repoPath}/commits?since=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}`;
  console.log('Fetching from:', url);

  const headers = { 'User-Agent': 'SkillTracker-App' };
  if (skill.github_token) {
    headers['Authorization'] = `token ${skill.github_token}`;
  }

  https.get(url, { headers }, (response) => {
    console.log('GitHub response status:', response.statusCode);
    let data = '';
    response.on('data', (chunk) => {
      data += chunk;
    });
    response.on('end', () => {
      try {
        const commits = JSON.parse(data);
        console.log('Commits fetched:', commits.length);
        
        // AI Analysis: Analyze commit activity and content
        let activityScore = 0;
        let keywords = ['fix', 'bug', 'feature', 'add', 'update', 'refactor', 'improve'];
        let keywordMatches = 0;
        
        commits.forEach(commit => {
          const message = commit.commit.message.toLowerCase();
          keywords.forEach(keyword => {
            if (message.includes(keyword)) keywordMatches++;
          });
        });
        
        // Calculate activity score based on commits and keywords
        activityScore = Math.min(commits.length * 2 + keywordMatches * 5, 50); // Max 50 points
        
        // Determine boost based on activity
        let boost = 0;
        if (activityScore >= 30) boost = 60;
        else if (activityScore >= 20) boost = 40;
        else if (activityScore >= 10) boost = 20;
        else if (activityScore >= 5) boost = 10;
        else boost = 5;
        
        // Ensure boost doesn't exceed what's needed to reach 100
        boost = Math.min(boost, 100 - skill.proficiency);
        
        const lastCommitMsg = commits.length > 0 ? commits[0].commit.message : 'No recent commits';
        
        skill.last_commit = lastCommitMsg;
        skill.proficiency += boost;
        skill.proficiency = Math.min(skill.proficiency, 100); // Cap at 100
        
        console.log(`AI Analysis: ${commits.length} commits, ${keywordMatches} keyword matches, activity score: ${activityScore}, boost: ${boost}%`);
        res.json({ message: `AI Boost: +${boost}%. Activity: ${commits.length} commits. Last: ${lastCommitMsg.substring(0, 50)}...` });
      } catch (err) {
        console.error('Parse error:', err);
        res.status(500).json({ message: 'Failed to parse GitHub response' });
      }
    });
  }).on('error', (err) => {
    console.error('GitHub sync error:', err);
    res.status(500).json({ message: 'Failed to sync with GitHub' });
  });
});

app.listen(5000, () => console.log('Backend running on port 5000'));