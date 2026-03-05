package proxy

import (
	"net/http"
	"net/http/httputil"
	"net/url"
)

func New(target string) (*httputil.ReverseProxy, error) {
	url, err := url.Parse(target)
	if err != nil {
		return nil, err
	}

	p := httputil.NewSingleHostReverseProxy(url)
	original := p.Director
	p.Director = func(req *http.Request) {
		original(req)
		req.Host = url.Host
		req.Header.Set("X-Origin-Host", url.Host)
	}

	return p, nil
}
