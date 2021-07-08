import AWS from 'aws-sdk'
import jwt from 'next-auth/jwt'
import { Record, String, Optional, Union, Literal, ValidationError } from 'runtypes'

const secret = process.env.JWT_SECRET

AWS.config.update({
    credentials: new AWS.Credentials({ accessKeyId: process.env.AWS_ACCESS_KEY, secretAccessKey: process.env.AWS_SECRET }),
    region: 'us-east-1'
})

const s3 = new AWS.S3()

const reqRunType = Record({
    body: Record({
        key: String,
        type: Union(Literal('getObject'), Literal('putObject')),
        contentType: Optional(String)
    })
})


const getSignedUrl = async (req, res) => {
    try {
        console.log('req.body', req.body)
        if (req.method === 'POST') {

            const token = await jwt.getToken({ req, secret })
            if (!token) {
                return res.status(403).send('Forbidden')
            }
            console.log('token', token)


            const validatedRequest = reqRunType.check(req)
            const { type, key, contentType } = validatedRequest.body

            if (type === 'putObject' && !contentType) {
                throw new Error('contentType is required when type is putObject')
            }

            const params = { Bucket: 'nicole-reed-gallery', Key: key }

            if (type === 'putObject') {
                params.ContentType = contentType
            }
            console.log('params', params)
            const signedUrl = s3.getSignedUrl(type, params)

            res.send({ signedUrl })
        } else {
            res.send('invalid method')
        }

    } catch (error) {
        console.log(error)
        if (error.name === 'ValidationError') {
            res.status(400).send(error.details)
        }

        res.status(500).send(error.message)
    }
}

export default getSignedUrl