# Linter for things in Terraform

Initially this is supposed to do one thing :

* Check taggable AWS resources to see if they have tags conforming to standards

You'll need to install this by copying a release onto your path : 

* [json2hcl](https://github.com/kvz/json2hcl)

## Configuration

Create a `.tflint.json` file in the root of your project.

This should have a single object in it, with one item, `tags`.

The subkeys of `tags` should be regex patterns that match resource types. Note that only AWS resource types that Terraform can apply tags to will be matched at all.

The subkeys of each pattern should have a value that is a regex that matches the values you consider acceptable for those tags. Non-string values in tags will be converted to strings before matching.

*NB backslash is an escape char in Javascript as well as regex so you'll have to escape it to use it - JSON doesn't permit literal regex values*

e.g. here we have a config where :

* **All** taggable resource should get a `Name` tag that's allowed to contain anything
* `aws_ami` resources should get a `version` tag composed solely of digits
* All `aws_db` resources should get a `securityClassification` tag that's one of
  * `official`
  * `secret`
  * `topsecret`

```json
{
  "tags": {
    "*.": {
      "Name": "^.*$"
    },
    "aws_ami": {
      "version": "^\\d+$"
    },
    "aws_db_.*": {
      "securityClassification": "^(official|secret|topsecret)$"
    }
  }
}
```

## Development notes

### Getting list of taggable resources

You can get the list of taggable resources that Terraform supports
by looking in the source for items that put it in their schema

```
# In the builtin/providers/aws folder of Terraform sources
grep -R '"tags".*tagsSchema\b' -l | egrep -o 'aws_[^\.]+' | sort
```