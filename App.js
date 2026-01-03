import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', decayScale: 1, repo: '', difficulty: 'easy' });
  const [syncResult, setSyncResult] = useState(null);

  // 1. Fetch skills from Backend
  const fetchSkills = async () => {
    try {
      const res = await fetch(`${API_BASE}/skills`);
      if (!res.ok) throw new Error('Failed to fetch skills');
      const data = await res.json();
      setSkills(data);
    } catch (err) {
      console.error("Error fetching data", err);
    }
  };

  // 2. Initial load and refresh timer
  useEffect(() => {
    fetchSkills();
    const interval = setInterval(fetchSkills, 5000);
    return () => clearInterval(interval);
  }, []);

  // 3. Handle adding a new skill
  const handleAddSkill = async (e) => {
    e.preventDefault();   // ✅ stays inside the function
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/add-skill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSkill.name,
          decay_rate: Number(newSkill.decayScale) / 100,
          github_repo: newSkill.repo,
          initial_proficiency: 100 + {easy: 20, moderate: 40, difficult: 60}[newSkill.difficulty]
        })
      });
      if (!res.ok) throw new Error('Failed to add skill');
      setNewSkill({ name: '', decayScale: 1, repo: '', difficulty: 'easy' });
      await fetchSkills();
    } catch (err) {
      console.error("Error adding skill:", err);
      alert("Backend error! Is the server running on port 5000?");
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle GitHub AI Sync
  const handleSync = async (id, repo) => {
    setLoading(true);
    setSyncResult("AI is analyzing recent commits...");
    try {
      const res = await fetch(`${API_BASE}/sync-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: id, repoPath: repo })
      });
      if (!res.ok) throw new Error('Sync failed');
      const data = await res.json();
      setSyncResult(`AI Success: ${data.message}`);
      await fetchSkills();
    } catch (err) {
      console.error("Sync error:", err);
      setSyncResult("AI Sync failed.");
    } finally {
      setLoading(false);
      setTimeout(() => setSyncResult(null), 5000);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>AI SKILL DECAY TRACKER</h1>
      <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>Track your skills, watch them decay over time, and boost proficiency by syncing with GitHub AI.</p>

      {/* Sync Result Toast */}
      {syncResult && (
        <div style={{ padding: '10px', background: '#d1ecf1', borderRadius: '5px', marginBottom: '10px', border: '1px solid #bee5eb' }}>
          {syncResult}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleAddSkill} style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: '#f4f4f4', padding: '20px', borderRadius: '10px' }}>
        <div>
          <label htmlFor="skillName" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Skill Name:</label>
          <input 
            id="skillName"
            placeholder="Enter the name of the skill (e.g., JavaScript)" 
            value={newSkill.name} 
            onChange={e => setNewSkill({...newSkill, name: e.target.value})} 
            style={{ padding: '10px' }} required 
          />
        </div>
        <div>
          <label htmlFor="decayScale" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Decay Speed (1-10):</label>
          <input 
            id="decayScale"
            type="number" 
            placeholder="Enter a value from 1 (slow decay) to 10 (fast decay)" 
            value={newSkill.decayScale} 
            onChange={e => setNewSkill({...newSkill, decayScale: e.target.value})} 
            style={{ padding: '10px' }} required 
          />
        </div>
        <div>
          <label htmlFor="repo" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>GitHub Repo (user/repo):</label>
          <input 
            id="repo"
            placeholder="Enter the GitHub repository in the format user/repo (e.g., octocat/Hello-World)" 
            value={newSkill.repo} 
            onChange={e => setNewSkill({...newSkill, repo: e.target.value})} 
            style={{ padding: '10px' }} required 
          />
        </div>
        <div>
          <label htmlFor="difficulty" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Task Difficulty:</label>
          <select 
            id="difficulty"
            value={newSkill.difficulty} 
            onChange={e => setNewSkill({...newSkill, difficulty: e.target.value})} 
            style={{ padding: '10px' }}
          >
            <option value="easy">Easy (20%)</option>
            <option value="moderate">Moderate (40%)</option>
            <option value="difficult">Difficult (60%)</option>
          </select>
        </div>
        <button type="submit" disabled={loading} style={{ padding: '10px', background: '#2c3e50', color: 'white', cursor: 'pointer', border: 'none', borderRadius: '4px' }}>
          {loading ? "Adding..." : "Add Skill"}
        </button>
      </form>

      {/* List of Skill Cards */}
      <div style={{ marginTop: '30px' }}>
        {skills.map(skill => (
          <div key={skill.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{skill.name} - {skill.github_repo}</strong>
              <span>{Math.round(skill.proficiency || 0)}%</span>
            </div>
            <div style={{ background: '#eee', height: '10px', marginTop: '10px', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${skill.proficiency || 0}%`, 
                height: '100%', 
                background: (skill.proficiency || 0) > 40 ? '#27ae60' : '#e74c3c',
                transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ marginTop: '10px', padding: '8px', background: '#f9f9f9', borderRadius: '4px', border: '1px solid #ddd' }}>
              <strong style={{ fontSize: '12px', color: '#333' }}>LAST COMMIT</strong><br />
              <span style={{ fontSize: '14px', color: '#555' }}>{skill.last_commit || 'No commit yet'}</span>
            </div>
            <button 
              onClick={() => handleSync(skill.id, skill.github_repo)} 
              disabled={loading}
              style={{ marginTop: '10px', width: '100%', padding: '8px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              🤖 AI Sync & Boost
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;