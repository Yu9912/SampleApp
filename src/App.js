import React, { useState, useEffect } from 'react';
import './App.css';
import { API, Storage } from 'aws-amplify';
import { AmplifyAuthenticator, AmplifySignOut, AmplifySignIn, AmplifySignUp } from '@aws-amplify/ui-react';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from './graphql/mutations';
import { I18n } from "aws-amplify";

// 以下のような形で日本語と英語を紐づけた辞書を作成する
const dict = {
  ja: {
    "Forgot your password?": "パスワードを忘れた場合",
    "Reset password": "パスワードをリセット",
    "No account?": "アカウントを持っていない場合",
    "Create account": "サインアップ",
  },
};

// 作成した辞書を渡して反映させる
I18n.putVocabularies(dict);
I18n.setLanguage("ja");

const initialFormState = { name: '', description: '' }

function App() {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function deleteNote({ id }) {
    const newNotesArray = notes.filter(note => note.id !== id);
    setNotes(newNotesArray);
    await API.graphql({ query: deleteNoteMutation, variables: { input: { id } }});
  }
  
  async function onChange(e) {
  if (!e.target.files[0]) return
  const file = e.target.files[0];
  setFormData({ ...formData, image: file.name });
  await Storage.put(file.name, file);
  fetchNotes();
  }
  
  async function fetchNotes() {
  const apiData = await API.graphql({ query: listNotes });
  const notesFromAPI = apiData.data.listNotes.items;
  await Promise.all(notesFromAPI.map(async note => {
    if (note.image) {
      const image = await Storage.get(note.image);
      note.image = image;
    }
    return note;
  }))
  setNotes(apiData.data.listNotes.items);
  }
  
  async function createNote() {
  if (!formData.name || !formData.description) return;
  await API.graphql({ query: createNoteMutation, variables: { input: formData } });
  if (formData.image) {
    const image = await Storage.get(formData.image);
    formData.image = image;
  }
  setNotes([ ...notes, formData ]);
  setFormData(initialFormState);
  }

  return (
  // ログインUIのカスタマイズ
  <AmplifyAuthenticator>
    <AmplifySignIn
       slot="sign-in"
        headerText="サインイン"
        submitButtonText="サインイン"
        formFields={[
          {
            type: "username",
            label: "ユーザ名 *",
            placeholder: "ユーザ名を入力",
            required: true,
          },
          {
            type: "password",
            label: "パスワード *",
            placeholder: "パスワードを入力",
            required: true,
          },
        ]}
      />

      <AmplifySignUp
        slot="sign-up"
        headerText="サインアップ"
        haveAccountText=""
        signInText="サインインに戻る"
        submitButtonText="アカウント作成"

        // formFields内に必要な項目だけを指定することで
        // 電話番号を除外できる
        formFields={[
          {
            type: "username",
            label: "ユーザ名を入力してください",
            placeholder: "ユーザ名",
          },
          {
            type: "password",
            label: "パスワードを入力してください",
            placeholder: "パスワード",
            inputProps: { required: true, autocomplete: "new-password" },
          },
        ]}
      />
    <div className="App">
      <h1>サンプルページ</h1>
      <input
        onChange={e => setFormData({ ...formData, 'name': e.target.value})}
        placeholder="タイトル"
        value={formData.name}
      />
      <input
        onChange={e => setFormData({ ...formData, 'description': e.target.value})}
        placeholder="内容"
        value={formData.description}
      />
      <button onClick={createNote}>作成</button>
      <input type="file" onChange={onChange}/>
      <div style={{marginBottom: 30}}>
        {
          notes.map(note => (
            <div key={note.id || note.name}>
              <h2>{note.name}</h2>
              <p>{note.description}</p>
              <button onClick={() => deleteNote(note)}>Delete note</button>
                {
                  note.image && <img src={note.image} alt={note.image} style={{width: 400}} />
                }
            </div>
          ))
        }
      </div>
      <AmplifySignOut />
    </div>
    </AmplifyAuthenticator>
  );
}

export default App;
