# Botzia

Source code for Botzia.

## Development

**Developed on NodeJS v17.3.0 and later**

- Clone the repository and `cd` into the root folder.
- `$ npm install` to install dependencies.
- Create a `.env` file and enter your bot token provided by Discord as `TOKEN=YourToken`.
- Build the JS code with `$ npm run build`.
- Run the bot with `$ npm start`.

### Configuration

Any changes to `.db` files in the database should not be committed.

You can make sure manually, or use some git commands:

```bash
# Ignore local changes to an existing file
$ git update-index --skip-worktree path/to/file

# Check ignored files (need git bash or other terminal with 'grep' enabled)
$ git ls-files -v | grep ^S

# Stop ignoring local changes to a file
$ git update-index --no-skip-worktree path/to/file
```

## User Data

All user data in the databases is used on an opt-in, opt-out basis by the users own choice. Any user data collected is never redistributed without explicit permission.

## Contributions

If you find a feature to be missing, feel free to create a pull request with it.

## License

NONE (No Permission)