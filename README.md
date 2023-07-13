# Botzia

Source code for Botzia.

## Development

- Developed with [Rust](https://www.rust-lang.org/) `1.70`.
- Deployed on [Shuttle](https://www.shuttle.rs). Check them out!

## Configuration

Any changes to `Secrets.toml` should not be committed.
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

## Licence

Permission is granted to submit code/PRs. Regarding anything else, unless otherwise stated, this project's current license is NONE (No Permission).